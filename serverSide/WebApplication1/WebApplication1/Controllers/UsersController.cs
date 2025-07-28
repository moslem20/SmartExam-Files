using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging;
using System.ComponentModel.DataAnnotations;
using WebApplication1.Models;
using Microsoft.AspNetCore.Http;
using System.IO;
using System;

namespace WebApplication1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly ILogger<UsersController> _logger;
        private IConfiguration Configuration;
        private readonly string _uploadPath;

        public UsersController(ILogger<UsersController> logger, IConfiguration configuration)
        {
            _logger = logger;
            Configuration = configuration;
            _uploadPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads"); // Define upload directory
            if (!Directory.Exists(_uploadPath))
            {
                Directory.CreateDirectory(_uploadPath);
            }
        }

        #region Endpoints
        [HttpPost("register")]
        public IActionResult Register([FromBody] RegisterRequest request)
        {
            try
            {
                var validationResult = ValidateRegistrationRequest(request);
                if (validationResult != null) return validationResult;

                if (AppUser.EmailExists(request.Email))
                    return Conflict("Email already exists");

                var newUser = CreateUserFromRequest(request);
                //newUser.Password = AppUser.HashPassword(newUser.Password); 

                var (success, error) = AppUser.Register(newUser);
                return success ? Ok(new { message = "Registration successful" }) : BadRequest(error);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Registration failed");
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginRequest request)
        {
            try
            {
                var user = AppUser.GetByEmail(request.Email, this.Configuration);
                if (user == null)
                {
                    return BadRequest(new { message = "the user is null" });
                }

                if (user.Password != request.Password)
                {
                    return BadRequest(new { message = "Invalid email or password" });
                }

                return Ok(new { message = "Login successful", user });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Login failed");
                return StatusCode(500, new { error = "Internal Server Error" });
            }
        }

        [HttpPost("upload-profile-image")]
        [DisableRequestSizeLimit] // Optional: Allows larger file uploads
        public async Task<IActionResult> UploadProfileImage([FromForm] IFormFile file, [FromForm] string email)
        {
            try
            {
                if (file == null || file.Length == 0)
                    return BadRequest("No file uploaded.");

                if (string.IsNullOrEmpty(email))
                    return BadRequest("Email is required.");

                var user = AppUser.GetByEmail(email, Configuration);
                if (user == null)
                    return NotFound("User not found.");

                // Generate a unique file name
                var fileName = $"{Guid.NewGuid()}_{file.FileName}";
                var filePath = Path.Combine(_uploadPath, fileName);

                // Save file to server
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                // Generate URL for the image (relative to wwwroot)
                var baseUrl = $"{Request.Scheme}://{Request.Host}";
                user.ProfileImageUrl = $"uploads/{fileName}";


                // Update user with new image URL
                var (success, error) = AppUser.Update(user);
                if (!success)
                    return BadRequest(error);

                return Ok(new { message = "Image uploaded successfully", imageUrl = user.ProfileImageUrl });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Image upload failed");
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpGet("get-profile-image")]
        public async Task<IActionResult> GetProfileImage(string email)
        {
            try
            {
                if (string.IsNullOrEmpty(email))
                    return BadRequest("Email is required.");

                var user = AppUser.GetByEmail(email, Configuration);
                if (user == null)
                    return NotFound("User not found.");

                if (string.IsNullOrEmpty(user.ProfileImageUrl))
                    return NotFound("No profile image available.");

                var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", user.ProfileImageUrl.TrimStart('/'));
                if (!System.IO.File.Exists(filePath))
                    return NotFound("Image file not found on server.");

                var fileStream = new FileStream(filePath, FileMode.Open, FileAccess.Read);
                return new FileStreamResult(fileStream, "image/jpeg"); // Adjust MIME type based on file type
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve profile image");
                return StatusCode(500, "Internal server error");
            }
        }

        public class UpdateTeacherNameRequest
        {
            public string Email { get; set; } = string.Empty;
            public string FullName { get; set; } = string.Empty;
        }


        [HttpPut("update-teacher-profile")]
        public IActionResult UpdateTeacherProfile([FromBody] UpdateTeacherNameRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.FullName))
                    return BadRequest("Email and full name are required.");

                var (success, error) = AppUser.UpdateTeacherNameOnly(request.Email, request.FullName);
                return success ? Ok(new { message = "Teacher profile updated successfully" }) : BadRequest(new { message = error });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to update teacher profile");
                return StatusCode(500, "Internal server error");
            }
        }



        [HttpGet("test-connection")]
        public IActionResult TestConnection()
        {
            try
            {
                using var connection = new SqlConnection(AppUser.GetPublicConnectionString());
                connection.Open();
                return Ok("Connection successful");
            }
            catch (Exception ex)
            {
                return BadRequest($"Connection failed: {ex.Message}");
            }
        }
        #endregion

        #region Helper Methods
        private IActionResult? ValidateRegistrationRequest(RegisterRequest request)
        {
            if (request == null) return BadRequest("Request is required");
            if (!ModelState.IsValid) return BadRequest(ModelState);
            if (request.Role != "student" && request.Role != "teacher")
                return BadRequest("Role must be 'student' or 'teacher'");
            return null;
        }

        private IActionResult? ValidateLoginRequest(LoginRequest request)
        {
            if (request == null) return BadRequest("Request is required");
            if (!ModelState.IsValid) return BadRequest(ModelState);
            return null;
        }

        private static AppUser CreateUserFromRequest(RegisterRequest request)
        {
            string role = request.Role.ToLower().Trim();

            // Determine student ID
            string studentId;
            if (role == "teacher")
            {
                // Teachers need a random ID to satisfy DB constraint
                studentId = Guid.NewGuid().ToString();
            }
            else
            {
                // For students: use provided or generate one
                studentId = string.IsNullOrWhiteSpace(request.StudentId)
                    ? Guid.NewGuid().ToString()
                    : request.StudentId.Trim();
            }

            return new AppUser
            {
                FullName = request.FullName.Trim(),
                Email = request.Email.ToLower().Trim(),
                Password = request.Password,
                Role = role,
                StudentId = studentId,
                PhoneNumber = role == "student" ? request.PhoneNumber?.Trim() : null
            };
        }

        private static bool VerifyPassword(AppUser user, string inputPassword)
        {
            return inputPassword == user.Password;
        }
        #endregion

        #region Request/Response Models
        public class RegisterRequest
        {
            [Required, StringLength(100, MinimumLength = 2)]
            public string FullName { get; set; } = string.Empty;

            [Required, EmailAddress]
            public string Email { get; set; } = string.Empty;

            [Required, MinLength(6, ErrorMessage = "Password must be at least 6 characters long.")]
            public string Password { get; set; } = string.Empty;

            [Required]
            public string Role { get; set; } = string.Empty;

            public string? StudentId { get; set; }
            public string? PhoneNumber { get; set; }
        }

        public class LoginRequest
        {
            [Required, EmailAddress]
            public string Email { get; set; } = string.Empty;

            [Required]
            public string Password { get; set; } = string.Empty;
        }

        public class LoginResponse
        {
            public string Message { get; } = "Login successful";
            public object User { get; }

            public LoginResponse(AppUser user)
            {
                User = new
                {
                    user.StudentId,
                    user.FullName,
                    user.Email,
                    user.Role,
                    user.ProfileImageUrl // Include profile image URL in response
                };
            }
        }
        #endregion
    }
}
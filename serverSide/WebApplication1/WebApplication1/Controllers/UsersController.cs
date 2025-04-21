using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging;
using System.ComponentModel.DataAnnotations;
using WebApplication1.Models;

namespace WebApplication1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly ILogger<UsersController> _logger;
        private IConfiguration Configuration;

        public UsersController(ILogger<UsersController> logger, IConfiguration configuration)
        {
            _logger = logger;
            Configuration = configuration;
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
            return new AppUser
            {
                FullName = request.FullName.Trim(),
                Email = request.Email.ToLower().Trim(),
                Password = request.Password, 
                Role = request.Role.ToLower(),
                StudentId = request.Role == "student" ? request.StudentId?.Trim() : null,
                PhoneNumber = request.Role == "student" ? request.PhoneNumber?.Trim() : null
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
                    user.Id,
                    user.FullName,
                    user.Email,
                    user.Role
                };
            }
        }
        #endregion
    }
}

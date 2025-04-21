using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.ComponentModel.DataAnnotations;
using WebApplication1.Models;

namespace WebApplication1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UpdateStudentProfileController : ControllerBase
    {
        private IConfiguration Configuration;

        public UpdateStudentProfileController(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        [HttpPut]
        public IActionResult UpdateStudent([FromBody] UpdateStudentProfileRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var user = AppUser.GetByEmail(request.Email, this.Configuration);
                if (user == null)
                    return NotFound("User not found");

                if (user.Role != "student")
                    return Forbid("Only students can update their profile");

                user.FullName = request.FullName;
                user.PhoneNumber = request.PhoneNumber;

                var (success, errorMessage) = AppUser.UpdateStudentProfile(user);
                return success
                    ? Ok(new { message = "Profile updated successfully", user })
                    : BadRequest(errorMessage);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }

    public class UpdateStudentProfileRequest
    {
        [Required, EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required, StringLength(100, MinimumLength = 2)]
        public string FullName { get; set; } = string.Empty;

        [Phone]
        public string? PhoneNumber { get; set; }
    }
}

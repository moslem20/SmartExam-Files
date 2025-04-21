using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using WebApplication1.Models;

namespace WebApplication1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UpdatedPassController : ControllerBase
    {
        private IConfiguration Configuration;
        public class ChangePasswordRequest
        {
            public string Email { get; set; } = string.Empty;
            public string CurrentPassword { get; set; } = string.Empty;
            public string NewPassword { get; set; } = string.Empty;
        }

        public UpdatedPassController(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        [HttpPut("change")]
        public IActionResult ChangePassword([FromBody] ChangePasswordRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.CurrentPassword) ||
                string.IsNullOrWhiteSpace(request.NewPassword))
            {
                return BadRequest("All fields are required.");
            }

            var user = AppUser.GetByEmail(request.Email,this.Configuration);
            if (user == null)
            {
                return NotFound("User not found.");
            }

            if (user.Password != request.CurrentPassword)
            {
                return BadRequest("Current password is incorrect.");
            }

            // Update password
            user.Password = request.NewPassword;
            var (success, error) = AppUser.Update(user);

            if (success)
            {
                return Ok("Password updated successfully.");
            }

            return StatusCode(500, error ?? "An error occurred while updating the password.");
        }
    }
}

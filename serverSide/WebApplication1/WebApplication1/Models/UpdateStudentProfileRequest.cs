using System.ComponentModel.DataAnnotations;

namespace WebApplication1.Models
{
    public class UpdateStudentProfileRequest
    {
        [Required]
        public string Email { get; set; } = string.Empty;

        [Required]
        [StringLength(100, MinimumLength = 2)]
        public string FullName { get; set; } = string.Empty;

        [Phone]
        public string? PhoneNumber { get; set; }
    }
}

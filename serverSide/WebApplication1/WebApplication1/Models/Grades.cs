using System.ComponentModel.DataAnnotations;

namespace WebApplication1.Models
{
    public class Grades
    {
        [Key]
        public int GradeId { get; set; }

        [Required]
        public string StudentId { get; set; }  // This should match the StudentId in AppUser

        [Required]
        [StringLength(100)]
        public string CourseName { get; set; } = string.Empty;

        [Required]
        [Range(0, 100)]
        public decimal Grade { get; set; }  // Renamed to avoid conflict with class name
    }
}

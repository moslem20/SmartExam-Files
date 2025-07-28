using System.ComponentModel.DataAnnotations;

namespace WebApplication1.Models
{
    public class GradesCreateDTO
    {
        [Required]
        public string StudentId { get; set; }

        [Required]
        [StringLength(100)]
        public string CourseName { get; set; }

        [Required]
        [Range(0, 100)]
        public decimal Grade { get; set; }

        [Required]
        public int ExamId { get; set; }
    }
}
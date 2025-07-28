using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization; // Use System.Text.Json

namespace WebApplication1.Models

{
    public class Grades
    {
        [Key]
        public int GradeId { get; set; }

        [Required]
        public string StudentId { get; set; }

        [Required]
        [StringLength(100)]
        public string CourseName { get; set; } = string.Empty;

        [Required]
        [Range(0, 100)]
        public decimal Grade { get; set; } // Keep as Grade, final exam grade from frontend

        [Required]
        public int ExamId { get; set; }

        [ForeignKey("ExamId")]
        [JsonIgnore] // Use System.Text.Json's JsonIgnore
        public Exam Exam { get; set; }  // Reference to the single Exam class
    }
}
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebApplication1.Models
{
    public class Feedback
    {
        [Key]
        public int FeedbackId { get; set; }

        [Required]
        public int GradeId { get; set; }

        [ForeignKey("GradeId")]
        public Grades Grade { get; set; }

        [Required]
        [EmailAddress]
        public string TeacherEmail { get; set; }

        [Required]
        public string FeedbackText { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}

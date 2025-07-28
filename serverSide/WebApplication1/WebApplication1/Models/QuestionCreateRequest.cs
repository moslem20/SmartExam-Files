using System.ComponentModel.DataAnnotations;

namespace WebApplication1.Models
{
    public class QuestionCreateRequest
    {
        [Required]
        public int ClassExamId { get; set; }

        [Required]
        public string QuestionType { get; set; } = string.Empty;

        [Required]
        public string QuestionText { get; set; } = string.Empty;

        public string? Answer { get; set; } // For student answers, should be null during creation
        public string? CorrectAnswer { get; set; }
        public string? Options { get; set; }
        public bool? IsTrue { get; set; }
        public string? Pairs { get; set; }
        public string? ImageUrl { get; set; }
        public int? TimeLimit { get; set; }
    }
}
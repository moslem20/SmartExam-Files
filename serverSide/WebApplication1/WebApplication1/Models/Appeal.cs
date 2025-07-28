namespace WebApplication1.Models
{
    public class Appeal
    {
        public Guid AppealId { get; set; }
        public int GradeId { get; set; }
        public string StudentId { get; set; }
        public string MessageText { get; set; }
        public DateTime SubmittedAt { get; set; }
        public string ClassId { get; set; }

        public Grades Grade { get; set; }
    }
}
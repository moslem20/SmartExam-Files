namespace WebApplication1.Models
{
    public class Exam
    {
        public int ExamId { get; set; }
        public DateTime ExamDate { get; set; }
        public string Course { get; set; }
        public string Time { get; set; }

        // New properties
        public string Title { get; set; }
        public string Description { get; set; }

        public Exam()
        {
            Course = string.Empty;
            Time = string.Empty;
            Title = string.Empty;
            Description = string.Empty;
        }
    }
}

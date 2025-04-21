namespace WebApplication1.Models
{
    public class Exam
    {
        public int ExamId { get; set; }
        public DateTime ExamDate { get; set; }
        public string Course { get; set; }
        public string Time { get; set; }

        public Exam()
        {
            Course = string.Empty;
            Time = string.Empty;
        }
    }


}

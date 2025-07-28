using System;
using System.Collections.Generic;

namespace WebApplication1.Models
{
    public class AnswerSubmission
    {
        public int ExamId { get; set; }
        public int StudentId { get; set; }
        public List<Answer> Answers { get; set; }
        public string Timestamp { get; set; }
    }

    public class Answer
    {
        public string QuestionId { get; set; } // GUID as string
        public string AnswerText { get; set; }
    }
}
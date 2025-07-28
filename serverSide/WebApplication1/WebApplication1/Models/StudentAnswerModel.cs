using Microsoft.Data.SqlClient;
using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace WebApplication1.Models
{
    public class StudentAnswerModel
    {
        [Key]
        public string AnswerId { get; set; } = string.Empty;

        [Required]
        public string QuestionId { get; set; } = string.Empty;

        // Navigation property for QuestionModel
        public QuestionModel? Question { get; set; }

        [Required]
        public int ClassExamId { get; set; }

        [Required]
        public string StudentId { get; set; } = string.Empty;

        public string? AnswerText { get; set; }
        public string? SelectedOption { get; set; }
        public bool? IsTrue { get; set; }
        public List<QuestionModel.MatchingPair>? MatchingPairs { get; set; }
        public DateTime SubmittedDate { get; set; } = DateTime.UtcNow;
        public decimal? Grade { get; set; }

        public static string GetConnectionString()
        {
            return "workstation id=smartExamDB.mssql.somee.com;packet size=4096;user id=moslem20_SQLLogin_1;pwd=3szyexdqk2;data source=smartExamDB.mssql.somee.com;persist security info=False;initial catalog=smartExamDB;TrustServerCertificate=True";
        }

        public static (bool Success, string Error) SubmitAnswer(StudentAnswerModel answer)
        {
            try
            {
                using var conn = new SqlConnection(GetConnectionString());
                conn.Open();

                Console.WriteLine($"Checking QuestionId: {answer.QuestionId}, ClassExamId: {answer.ClassExamId}"); // Debug log
                var checkQuery = "SELECT 1 FROM Questions WHERE QuestionId = @QuestionId AND ClassExamId = @ClassExamId";
                using var checkCmd = new SqlCommand(checkQuery, conn);
                checkCmd.Parameters.AddWithValue("@QuestionId", Guid.Parse(answer.QuestionId));
                checkCmd.Parameters.AddWithValue("@ClassExamId", answer.ClassExamId);
                if (checkCmd.ExecuteScalar() == null)
                {
                    return (false, "Question or exam not found");
                }

                answer.AnswerId = Guid.NewGuid().ToString();

                var query = @"
                    INSERT INTO StudentAnswers (AnswerId, QuestionId, ClassExamId, StudentId, AnswerText, SelectedOption, IsTrue, MatchingPairs, SubmittedDate, Grade)
                    VALUES (@AnswerId, @QuestionId, @ClassExamId, @StudentId, @AnswerText, @SelectedOption, @IsTrue, @MatchingPairs, @SubmittedDate, @Grade)";

                using var cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@AnswerId", answer.AnswerId);
                cmd.Parameters.AddWithValue("@QuestionId", Guid.Parse(answer.QuestionId));
                cmd.Parameters.AddWithValue("@ClassExamId", answer.ClassExamId);
                cmd.Parameters.AddWithValue("@StudentId", answer.StudentId);
                cmd.Parameters.AddWithValue("@AnswerText", (object?)answer.AnswerText ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@SelectedOption", (object?)answer.SelectedOption ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@IsTrue", (object?)answer.IsTrue ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@MatchingPairs", (object?)(answer.MatchingPairs != null ? JsonSerializer.Serialize(answer.MatchingPairs) : null) ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@SubmittedDate", answer.SubmittedDate);
                cmd.Parameters.AddWithValue("@Grade", (object?)answer.Grade ?? DBNull.Value);

                int rows = cmd.ExecuteNonQuery();
                return rows > 0 ? (true, string.Empty) : (false, "Failed to submit answer");
            }
            catch (Exception ex)
            {
                return (false, $"Error submitting answer: {ex.Message}");
            }
        }
    }
}
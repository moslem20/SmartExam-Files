using Microsoft.Data.SqlClient;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace WebApplication1.Models
{
    public class QuestionModel
    {
        [Key]
        public string QuestionId { get; set; } = string.Empty; // Keep as string

        [Required]
        public int ClassExamId { get; set; }

        [Required]
        public string QuestionType { get; set; } = string.Empty;

        [Required]
        public string QuestionText { get; set; } = string.Empty;

        public string? Answer { get; set; }
        public string? Options { get; set; } // Stored as JSON array
        public string? CorrectAnswer { get; set; }
        public bool? IsTrue { get; set; }
        public List<MatchingPair>? Pairs { get; set; }
        public string? ImageUrl { get; set; }

        [Required]
        public int TimeLimit { get; set; } // New field for timer

        public class MatchingPair
        {
            public string Left { get; set; } = string.Empty;
            public string Right { get; set; } = string.Empty;
        }

        private static string GetConnectionString()
        {
            return "workstation id=smartExamDB.mssql.somee.com;packet size=4096;user id=moslem20_SQLLogin_1;pwd=3szyexdqk2;data source=smartExamDB.mssql.somee.com;persist security info=False;initial catalog=smartExamDB;TrustServerCertificate=True";
        }

        public static (bool Success, string Error) Create(QuestionModel question)
        {
            try
            {
                using var conn = new SqlConnection(GetConnectionString());
                conn.Open();

                var checkQuery = "SELECT 1 FROM ClassExams WHERE Id = @ClassExamId";
                using var checkCmd = new SqlCommand(checkQuery, conn);
                checkCmd.Parameters.AddWithValue("@ClassExamId", question.ClassExamId);
                if (checkCmd.ExecuteScalar() == null)
                {
                    return (false, "Class exam not found");
                }

                question.QuestionId = Guid.NewGuid().ToString();

                var query = @"
                INSERT INTO Questions (QuestionId, ClassExamId, QuestionType, QuestionText, Answer, Options, CorrectAnswer, IsTrue, Pairs, ImageUrl, TimeLimit)
                VALUES (@QuestionId, @ClassExamId, @QuestionType, @QuestionText, @Answer, @Options, @CorrectAnswer, @IsTrue, @Pairs, @ImageUrl, @TimeLimit)";

                using var cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@QuestionId", question.QuestionId);
                cmd.Parameters.AddWithValue("@ClassExamId", question.ClassExamId);
                cmd.Parameters.AddWithValue("@QuestionType", question.QuestionType);
                cmd.Parameters.AddWithValue("@QuestionText", question.QuestionText);
                cmd.Parameters.AddWithValue("@Answer", (object?)question.Answer ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@Options", (object?)question.Options ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@CorrectAnswer", (object?)question.CorrectAnswer ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@IsTrue", (object?)question.IsTrue ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@Pairs", (object?)(question.Pairs != null ? JsonSerializer.Serialize(question.Pairs) : null) ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@ImageUrl", (object?)question.ImageUrl ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@TimeLimit", question.TimeLimit);

                int rows = cmd.ExecuteNonQuery();
                return rows > 0 ? (true, string.Empty) : (false, "Failed to create question");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error creating question: {ex.Message}");
                return (false, $"Error creating question: {ex.Message}");
            }
        }

        public static List<QuestionModel> GetByExamId(int examId)
        {
            var questions = new List<QuestionModel>();
            try
            {
                using var conn = new SqlConnection(GetConnectionString());
                conn.Open();

                var query = @"
                SELECT q.QuestionId, q.ClassExamId, q.QuestionType, q.QuestionText, q.Answer, q.Options, q.CorrectAnswer, q.IsTrue, q.Pairs, q.ImageUrl, q.TimeLimit
                FROM Questions q
                INNER JOIN ClassExams ce ON q.ClassExamId = ce.Id
                WHERE ce.ExamId = @ExamId";

                using var cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@ExamId", examId);

                using var reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    questions.Add(new QuestionModel
                    {
                        QuestionId = reader.GetString(0),
                        ClassExamId = reader.GetInt32(1),
                        QuestionType = reader.GetString(2),
                        QuestionText = reader.GetString(3),
                        Answer = reader.IsDBNull(4) ? null : reader.GetString(4),
                        Options = reader.IsDBNull(5) ? null : reader.GetString(5),
                        CorrectAnswer = reader.IsDBNull(6) ? null : reader.GetString(6),
                        IsTrue = reader.IsDBNull(7) ? null : reader.GetBoolean(7),
                        Pairs = reader.IsDBNull(8) ? null : JsonSerializer.Deserialize<List<MatchingPair>>(reader.GetString(8)),
                        ImageUrl = reader.IsDBNull(9) ? null : reader.GetString(9),
                        TimeLimit = reader.GetInt32(10)
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetByExamId: {ex.Message}");
            }
            return questions;
        }

        public static QuestionModel? GetById(string questionId)
        {
            try
            {
                using var conn = new SqlConnection(GetConnectionString());
                conn.Open();

                var query = @"
                SELECT QuestionId, ClassExamId, QuestionType, QuestionText, Answer, Options, CorrectAnswer, IsTrue, Pairs, ImageUrl, TimeLimit
                FROM Questions
                WHERE QuestionId = @QuestionId";

                using var cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@QuestionId", questionId);

                using var reader = cmd.ExecuteReader();
                if (reader.Read())
                {
                    return new QuestionModel
                    {
                        QuestionId = reader.GetString(0),
                        ClassExamId = reader.GetInt32(1),
                        QuestionType = reader.GetString(2),
                        QuestionText = reader.GetString(3),
                        Answer = reader.IsDBNull(4) ? null : reader.GetString(4),
                        Options = reader.IsDBNull(5) ? null : reader.GetString(5),
                        CorrectAnswer = reader.IsDBNull(6) ? null : reader.GetString(6),
                        IsTrue = reader.IsDBNull(7) ? null : reader.GetBoolean(7),
                        Pairs = reader.IsDBNull(8) ? null : JsonSerializer.Deserialize<List<MatchingPair>>(reader.GetString(8)),
                        ImageUrl = reader.IsDBNull(9) ? null : reader.GetString(9),
                        TimeLimit = reader.GetInt32(10)
                    };
                }
                return null;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetById: {ex.Message}");
                return null;
            }
        }

        public static (bool Success, string Error) Update(QuestionModel question)
        {
            try
            {
                using var conn = new SqlConnection(GetConnectionString());
                conn.Open();

                var checkQuery = "SELECT 1 FROM ClassExams WHERE Id = @ClassExamId";
                using var checkCmd = new SqlCommand(checkQuery, conn);
                checkCmd.Parameters.AddWithValue("@ClassExamId", question.ClassExamId);
                if (checkCmd.ExecuteScalar() == null)
                {
                    return (false, "Class exam not found");
                }

                var query = @"
                UPDATE Questions
                SET ClassExamId = @ClassExamId, QuestionType = @QuestionType, QuestionText = @QuestionText,
                    Answer = @Answer, Options = @Options, CorrectAnswer = @CorrectAnswer, IsTrue = @IsTrue,
                    Pairs = @Pairs, ImageUrl = @ImageUrl, TimeLimit = @TimeLimit
                WHERE QuestionId = @QuestionId";

                using var cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@QuestionId", question.QuestionId);
                cmd.Parameters.AddWithValue("@ClassExamId", question.ClassExamId);
                cmd.Parameters.AddWithValue("@QuestionType", question.QuestionType);
                cmd.Parameters.AddWithValue("@QuestionText", question.QuestionText);
                cmd.Parameters.AddWithValue("@Answer", (object?)question.Answer ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@Options", (object?)question.Options ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@CorrectAnswer", (object?)question.CorrectAnswer ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@IsTrue", (object?)question.IsTrue ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@Pairs", (object?)(question.Pairs != null ? JsonSerializer.Serialize(question.Pairs) : null) ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@ImageUrl", (object?)question.ImageUrl ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@TimeLimit", question.TimeLimit);

                int rows = cmd.ExecuteNonQuery();
                return rows > 0 ? (true, string.Empty) : (false, "Question not found");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error updating question: {ex.Message}");
                return (false, $"Error updating question: {ex.Message}");
            }
        }

        public static bool Delete(string questionId)
        {
            try
            {
                using var conn = new SqlConnection(GetConnectionString());
                conn.Open();

                var query = "DELETE FROM Questions WHERE QuestionId = @QuestionId";
                using var cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@QuestionId", questionId);

                int rows = cmd.ExecuteNonQuery();
                return rows > 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in Delete: {ex.Message}"); // Use ILogger in controller
                return false;
            }
        }
    }
}
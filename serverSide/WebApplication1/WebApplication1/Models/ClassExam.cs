using Microsoft.Data.SqlClient;
using System;
using System.ComponentModel.DataAnnotations;

namespace WebApplication1.Models
{
    public class ClassExamModel
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string ClassId { get; set; } = string.Empty;

        [Required]
        public int ExamId { get; set; }

        private static string GetConnectionString()
        {
            return "workstation id=smartExamDB.mssql.somee.com;packet size=4096;user id=moslem20_SQLLogin_1;pwd=3szyexdqk2;data source=smartExamDB.mssql.somee.com;persist security info=False;initial catalog=smartExamDB;TrustServerCertificate=True";
        }

        public static (bool Success, string Error, int Id) Create(ClassExamModel classExam)
        {
            try
            {
                using var conn = new SqlConnection(GetConnectionString());
                conn.Open();

                var query = @"
                    INSERT INTO ClassExams (ClassId, ExamId)
                    OUTPUT INSERTED.Id
                    VALUES (@ClassId, @ExamId)";

                using var cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@ClassId", classExam.ClassId);
                cmd.Parameters.AddWithValue("@ExamId", classExam.ExamId);

                classExam.Id = Convert.ToInt32(cmd.ExecuteScalar());
                return (true, string.Empty, classExam.Id);
            }
            catch (Exception ex)
            {
                return (false, $"Error creating ClassExam: {ex.Message}", 0);
            }
        }
    }
}
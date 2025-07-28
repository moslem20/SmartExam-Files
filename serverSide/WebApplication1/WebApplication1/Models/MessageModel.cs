using Microsoft.Data.SqlClient;
using System;
using System.Collections.Generic;

namespace WebApplication1.Models
{
    public class MessageModel
    {
        public string Id { get; set; } = string.Empty;
        public string ClassId { get; set; } = string.Empty;
        public string TeacherEmail { get; set; } = string.Empty;
        public string StudentId { get; set; } = string.Empty;
        public string MessageText { get; set; } = string.Empty;
        public DateTime SentAt { get; set; }
        public string CourseName { get; set; } = string.Empty; // Added for course name
        public string SenderName { get; set; } = string.Empty; // Added for sender name

        private static string GetConnectionString()
        {
            return new SqlConnectionStringBuilder
            {
                ConnectionString = "workstation id=smartExamDB.mssql.somee.com;packet size=4096;user id=moslem20_SQLLogin_1;pwd=3szyexdqk2;data source=smartExamDB.mssql.somee.com;persist security info=False;initial catalog=smartExamDB;TrustServerCertificate=True"
            }.ToString();
        }

        // Existing methods (CreateMessages, GetMessagesByClassAndTeacher) remain unchanged
        public static (bool Success, string Error) CreateMessages(string classId, string teacherEmail, string messageText)
        {
            try
            {
                using var conn = new SqlConnection(GetConnectionString());
                conn.Open();

                var verifyTeacherQuery = "SELECT 1 FROM Users WHERE Email = @Email AND Role = 'teacher'";
                using var cmdVerifyTeacher = new SqlCommand(verifyTeacherQuery, conn);
                cmdVerifyTeacher.Parameters.AddWithValue("@Email", teacherEmail);
                if (cmdVerifyTeacher.ExecuteScalar() == null)
                {
                    System.Diagnostics.Debug.WriteLine($"Invalid TeacherEmail: {teacherEmail}");
                    return (false, "Teacher not found or not authorized");
                }

                var verifyClassQuery = "SELECT 1 FROM Classes WHERE Id = @ClassId";
                using var cmdVerifyClass = new SqlCommand(verifyClassQuery, conn);
                cmdVerifyClass.Parameters.AddWithValue("@ClassId", classId);
                if (cmdVerifyClass.ExecuteScalar() == null)
                {
                    System.Diagnostics.Debug.WriteLine($"Invalid ClassId: {classId}");
                    return (false, "Class not found");
                }

                var studentIds = new List<string>();
                var getStudentsQuery = "SELECT studentId FROM ClassStudents WHERE classId = @ClassId";
                using var cmdGetStudents = new SqlCommand(getStudentsQuery, conn);
                cmdGetStudents.Parameters.AddWithValue("@ClassId", classId);
                using var reader = cmdGetStudents.ExecuteReader();
                while (reader.Read())
                {
                    studentIds.Add(reader.GetString(0));
                }
                reader.Close();

                if (studentIds.Count == 0)
                {
                    System.Diagnostics.Debug.WriteLine($"No students found for ClassId: {classId}");
                    return (false, "No students enrolled in the class");
                }

                foreach (var studentId in studentIds)
                {
                    var insertQuery = @"
                        INSERT INTO Messages (Id, ClassId, TeacherEmail, StudentId, MessageText, SentAt)
                        VALUES (@Id, @ClassId, @TeacherEmail, @StudentId, @MessageText, @SentAt)";

                    using var cmdInsert = new SqlCommand(insertQuery, conn);
                    cmdInsert.Parameters.AddWithValue("@Id", Guid.NewGuid().ToString());
                    cmdInsert.Parameters.AddWithValue("@ClassId", classId);
                    cmdInsert.Parameters.AddWithValue("@TeacherEmail", teacherEmail);
                    cmdInsert.Parameters.AddWithValue("@StudentId", studentId);
                    cmdInsert.Parameters.AddWithValue("@MessageText", messageText);
                    cmdInsert.Parameters.AddWithValue("@SentAt", DateTime.UtcNow);

                    int rowsAffected = cmdInsert.ExecuteNonQuery();
                    if (rowsAffected == 0)
                    {
                        System.Diagnostics.Debug.WriteLine($"Failed to insert message for StudentId: {studentId}");
                        return (false, $"Failed to send message to StudentId: {studentId}");
                    }
                    System.Diagnostics.Debug.WriteLine($"Inserted message for StudentId: {studentId}");
                }

                return (true, string.Empty);
            }
            catch (SqlException ex)
            {
                System.Diagnostics.Debug.WriteLine($"SQL Error in CreateMessages: {ex.Message}, Number: {ex.Number}");
                return (false, $"Database error: {ex.Message}");
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error in CreateMessages: {ex.Message}");
                return (false, $"Error: {ex.Message}");
            }
        }

        public static (bool Success, List<MessageModel> Messages, string Error) GetMessagesByClassAndTeacher(string classId, string teacherEmail)
        {
            try
            {
                var messages = new List<MessageModel>();
                using var conn = new SqlConnection(GetConnectionString());
                conn.Open();

                var verifyTeacherQuery = "SELECT 1 FROM Users WHERE Email = @Email AND Role = 'teacher'";
                using var cmdVerifyTeacher = new SqlCommand(verifyTeacherQuery, conn);
                cmdVerifyTeacher.Parameters.AddWithValue("@Email", teacherEmail);
                if (cmdVerifyTeacher.ExecuteScalar() == null)
                {
                    System.Diagnostics.Debug.WriteLine($"Invalid TeacherEmail: {teacherEmail}");
                    return (false, null, "Teacher not found or not authorized");
                }

                var query = @"
                    SELECT Id, ClassId, TeacherEmail, StudentId, MessageText, SentAt
                    FROM Messages
                    WHERE ClassId = @ClassId AND TeacherEmail = @TeacherEmail
                    ORDER BY SentAt DESC";
                using var cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@ClassId", classId);
                cmd.Parameters.AddWithValue("@TeacherEmail", teacherEmail);

                using var reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    messages.Add(new MessageModel
                    {
                        Id = reader.GetString(0),
                        ClassId = reader.GetString(1),
                        TeacherEmail = reader.GetString(2),
                        StudentId = reader.GetString(3),
                        MessageText = reader.GetString(4),
                        SentAt = reader.GetDateTime(5)
                    });
                }

                return (true, messages, string.Empty);
            }
            catch (SqlException ex)
            {
                System.Diagnostics.Debug.WriteLine($"SQL Error in GetMessagesByClassAndTeacher: {ex.Message}, Number: {ex.Number}");
                return (false, null, $"Database error: {ex.Message}");
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error in GetMessagesByClassAndTeacher: {ex.Message}");
                return (false, null, $"Error: {ex.Message}");
            }
        }

        // New method to get messages for a student
        public static (bool Success, List<MessageModel> Messages, string Error) GetMessagesByStudent(string studentId)
        {
            try
            {
                var messages = new List<MessageModel>();
                using var conn = new SqlConnection(GetConnectionString());
                conn.Open();

                // Verify student exists
                var verifyStudentQuery = "SELECT 1 FROM Users WHERE StudentId = @StudentId AND Role = 'student'";
                using var cmdVerifyStudent = new SqlCommand(verifyStudentQuery, conn);
                cmdVerifyStudent.Parameters.AddWithValue("@StudentId", studentId);
                if (cmdVerifyStudent.ExecuteScalar() == null)
                {
                    System.Diagnostics.Debug.WriteLine($"Invalid StudentId: {studentId}");
                    return (false, null, "Student not found");
                }

                // Fetch messages with course and sender details
                var query = @"
                    SELECT M.Id, M.ClassId, M.TeacherEmail, M.StudentId, M.MessageText, M.SentAt, 
                           C.CourseName, U.FullName
                    FROM Messages M
                    JOIN Classes C ON M.ClassId = C.Id
                    JOIN ClassStudents CS ON M.ClassId = CS.classId AND M.StudentId = CS.studentId
                    JOIN Users U ON M.TeacherEmail = U.Email
                    WHERE M.StudentId = @StudentId
                    ORDER BY M.SentAt DESC";
                using var cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@StudentId", studentId);

                using var reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    messages.Add(new MessageModel
                    {
                        Id = reader.GetString(0),
                        ClassId = reader.GetString(1),
                        TeacherEmail = reader.GetString(2),
                        StudentId = reader.GetString(3),
                        MessageText = reader.GetString(4),
                        SentAt = reader.GetDateTime(5),
                        CourseName = reader.GetString(6),
                        SenderName = reader.GetString(7)
                    });
                }

                return (true, messages, string.Empty);
            }
            catch (SqlException ex)
            {
                System.Diagnostics.Debug.WriteLine($"SQL Error in GetMessagesByStudent: {ex.Message}, Number: {ex.Number}");
                return (false, null, $"Database error: {ex.Message}");
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error in GetMessagesByStudent: {ex.Message}");
                return (false, null, $"Error: {ex.Message}");
            }
        }
    }
}
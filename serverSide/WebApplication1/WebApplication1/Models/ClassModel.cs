using Microsoft.Data.SqlClient;
using System.ComponentModel.DataAnnotations;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebApplication1.Models
{
    public class ClassModel
    {
        [Key]
        public string Id { get; set; } = string.Empty;

        [Required]
        public string CourseName { get; set; } = string.Empty;

        public string? Description { get; set; }

        [Required]
        public string TeacherEmail { get; set; } = string.Empty;//should add in SQL

        [NotMapped]
        public List<string> StudentIds { get; set; } = new List<string>();

        private static string GetConnectionString()
        {
            return new SqlConnectionStringBuilder
            {
                ConnectionString = "workstation id=smartExamDB.mssql.somee.com;packet size=4096;user id=moslem20_SQLLogin_1;pwd=3szyexdqk2;data source=smartExamDB.mssql.somee.com;persist security info=False;initial catalog=smartExamDB;TrustServerCertificate=True"
            }.ToString();
        }

        public static (bool Success, string Error) Create(ClassModel classModel, List<string> studentIds)
        {
            try
            {
                using var conn = new SqlConnection(GetConnectionString());
                conn.Open();

                var verifyTeacherQuery = "SELECT 1 FROM Users WHERE Email = @Email AND Role = 'teacher'";
                using var verifyTeacherCmd = new SqlCommand(verifyTeacherQuery, conn);
                verifyTeacherCmd.Parameters.AddWithValue("@Email", classModel.TeacherEmail.ToLower());

                var teacherExists = verifyTeacherCmd.ExecuteScalar() != null;
                if (!teacherExists)
                {
                    return (false, $"Teacher with email '{classModel.TeacherEmail}' does not exist or is not registered as a teacher.");
                }


                var insertClassQuery = @"
                    INSERT INTO Classes (Id, CourseName, Description, TeacherEmail)
                    VALUES (@Id, @CourseName, @Description, @TeacherEmail);";

                using var cmd = new SqlCommand(insertClassQuery, conn);
                cmd.Parameters.AddWithValue("@Id", classModel.Id);
                cmd.Parameters.AddWithValue("@CourseName", classModel.CourseName);
                cmd.Parameters.AddWithValue("@Description", (object?)classModel.Description ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@TeacherEmail", classModel.TeacherEmail);

                int rowsAffected = cmd.ExecuteNonQuery();
                if (rowsAffected == 0)
                {
                    return (false, "Failed to create class");
                }

                classModel.StudentIds = studentIds ?? new List<string>();

                if (studentIds != null && studentIds.Count > 0)
                {
                    foreach (var studentId in studentIds)
                    {
                        var verifyStudentQuery = "SELECT 1 FROM Users WHERE StudentId = @StudentId AND Role = 'student'";
                        using var cmdVerifyStudent = new SqlCommand(verifyStudentQuery, conn);
                        cmdVerifyStudent.Parameters.AddWithValue("@StudentId", studentId);

                        var studentExists = cmdVerifyStudent.ExecuteScalar() != null;
                        if (!studentExists)
                        {
                            return (false, $"Invalid StudentId: {studentId}. Ensure it exists in Users with Role = 'student'.");
                        }

                        var insertStudentQuery = @"
                            INSERT INTO ClassStudents (ClassId, StudentId)
                            VALUES (@ClassId, @StudentId)";

                        using var cmdInsertStudent = new SqlCommand(insertStudentQuery, conn);
                        cmdInsertStudent.Parameters.AddWithValue("@ClassId", classModel.Id);
                        cmdInsertStudent.Parameters.AddWithValue("@StudentId", studentId);

                        int studentRowsAffected = cmdInsertStudent.ExecuteNonQuery();
                        if (studentRowsAffected == 0)
                        {
                            return (false, $"Failed to associate StudentId: {studentId} with ClassId: {classModel.Id}");
                        }
                    }
                }

                return (true, string.Empty);
            }
            catch (SqlException ex)
            {
                System.Diagnostics.Debug.WriteLine($"SQL Error in Create: {ex.Message}, Number: {ex.Number}");
                return (false, $"Database error: {ex.Message}");
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error in Create: {ex.Message}");
                return (false, $"Error: {ex.Message}");
            }
        }

        public static List<ClassModel> GetAll()
        {
            var classes = new List<ClassModel>();
            using var conn = new SqlConnection(GetConnectionString());
            conn.Open();

            var query = "SELECT Id, CourseName, Description, TeacherEmail FROM Classes";
            using var cmd = new SqlCommand(query, conn);

            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                classes.Add(new ClassModel
                {
                    Id = reader.GetString(0),
                    CourseName = reader.GetString(1),
                    Description = reader.IsDBNull(2) ? null : reader.GetString(2),
                    TeacherEmail = reader.GetString(3),
                    StudentIds = GetStudentIdsForClass(reader.GetString(0))
                });
            }

            return classes;
        }

        public static List<ClassModel> GetByTeacherEmail(string teacherEmail, SqlConnection connection)
        {
            var classes = new List<ClassModel>();
            var query = "SELECT Id, CourseName, Description, TeacherEmail FROM Classes WHERE TeacherEmail = @TeacherEmail";

            using var cmd = new SqlCommand(query, connection);
            cmd.Parameters.AddWithValue("@TeacherEmail", teacherEmail);

            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                var classId = reader["Id"].ToString();

                classes.Add(new ClassModel
                {
                    Id = classId,
                    CourseName = reader["CourseName"].ToString(),
                    Description = reader["Description"]?.ToString(),
                    TeacherEmail = reader["TeacherEmail"].ToString(),
                    StudentIds = GetStudentIdsForClass(classId) // pull from ClassStudents
                });
            }

            return classes;
        }



        public static ClassModel? GetById(string id)
        {
            using var conn = new SqlConnection(GetConnectionString());
            conn.Open();

            var query = "SELECT Id, CourseName, Description, TeacherEmail FROM Classes WHERE Id = @Id";
            using var cmd = new SqlCommand(query, conn);
            cmd.Parameters.AddWithValue("@Id", id);

            using var reader = cmd.ExecuteReader();
            if (reader.Read())
            {
                return new ClassModel
                {
                    Id = reader.GetString(0),
                    CourseName = reader.GetString(1),
                    Description = reader.IsDBNull(2) ? null : reader.GetString(2),
                    TeacherEmail = reader.GetString(3),
                    StudentIds = GetStudentIdsForClass(reader.GetString(0))
                };
            }
            return null;
        }

        public static List<string> GetStudentIdsForClass(string classId)
        {
            var studentIds = new List<string>();
            using var conn = new SqlConnection(GetConnectionString());
            conn.Open();

            var query = "SELECT StudentId FROM ClassStudents WHERE ClassId = @ClassId";
            using var cmd = new SqlCommand(query, conn);
            cmd.Parameters.AddWithValue("@ClassId", classId);

            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                studentIds.Add(reader.GetString(0));
            }

            return studentIds;
        }

        public static List<string> GetStudentsInClass(string classId)
        {
            var students = new List<string>();
            using var conn = new SqlConnection(GetConnectionString());
            conn.Open();

            var query = @"
                SELECT U.FullName
                FROM ClassStudents CS
                JOIN Users U ON CS.StudentId = U.StudentId
                WHERE CS.ClassId = @ClassId";

            using var cmd = new SqlCommand(query, conn);
            cmd.Parameters.AddWithValue("@ClassId", classId);

            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                students.Add(reader.GetString(0));
            }

            return students;
        }

        public static (bool Success, string? Error) Update(ClassModel classModel)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(classModel.Id))
                {
                    System.Diagnostics.Debug.WriteLine("Update failed: ID is null or empty.");
                    return (false, "Class ID is required");
                }

                using var conn = new SqlConnection(GetConnectionString());
                conn.Open();
                using var transaction = conn.BeginTransaction();

                var checkQuery = "SELECT Id FROM Classes WHERE Id = @Id";
                using var checkCmd = new SqlCommand(checkQuery, conn, transaction);
                checkCmd.Parameters.AddWithValue("@Id", classModel.Id);
                var classId = checkCmd.ExecuteScalar();
                if (classId == null)
                {
                    System.Diagnostics.Debug.WriteLine($"Class not found for ID: '{classModel.Id}'");
                    transaction.Rollback();
                    return (false, "Class not found");
                }

                var updateQuery = @"
                    UPDATE Classes
                    SET CourseName = @CourseName,
                        Description = @Description,
                        TeacherEmail = @TeacherEmail
                    WHERE Id = @Id";
                using var cmd = new SqlCommand(updateQuery, conn, transaction);
                cmd.Parameters.AddWithValue("@CourseName", classModel.CourseName);
                cmd.Parameters.AddWithValue("@Description", (object?)classModel.Description ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@TeacherEmail", classModel.TeacherEmail);
                cmd.Parameters.AddWithValue("@Id", classModel.Id);
                int rowsAffected = cmd.ExecuteNonQuery();
                System.Diagnostics.Debug.WriteLine($"Updated {rowsAffected} Classes records for ID: '{classModel.Id}'");

                if (rowsAffected == 0)
                {
                    System.Diagnostics.Debug.WriteLine($"No rows updated for Classes with ID: '{classModel.Id}'");
                    transaction.Rollback();
                    return (false, "Class not found");
                }

                var deleteStudentsQuery = "DELETE FROM ClassStudents WHERE ClassId = @Id";
                using var cmdDelStudents = new SqlCommand(deleteStudentsQuery, conn, transaction);
                cmdDelStudents.Parameters.AddWithValue("@Id", classModel.Id);
                int studentRowsDeleted = cmdDelStudents.ExecuteNonQuery();
                System.Diagnostics.Debug.WriteLine($"Deleted {studentRowsDeleted} ClassStudents records for ClassId: '{classModel.Id}'");

                if (classModel.StudentIds != null && classModel.StudentIds.Count > 0)
                {
                    foreach (var studentId in classModel.StudentIds)
                    {
                        var verifyStudentQuery = "SELECT 1 FROM Users WHERE StudentId = @StudentId AND Role = 'student'";
                        using var cmdVerifyStudent = new SqlCommand(verifyStudentQuery, conn, transaction);
                        cmdVerifyStudent.Parameters.AddWithValue("@StudentId", studentId);
                        var studentExists = cmdVerifyStudent.ExecuteScalar() != null;
                        if (!studentExists)
                        {
                            System.Diagnostics.Debug.WriteLine($"Invalid StudentId: '{studentId}' for ClassId: '{classModel.Id}'");
                            transaction.Rollback();
                            return (false, $"Invalid StudentId: {studentId}. Ensure it exists in Users with Role = 'student'.");
                        }

                        var insertStudentQuery = @"
                            INSERT INTO ClassStudents (ClassId, StudentId)
                            VALUES (@ClassId, @StudentId)";
                        using var cmdInsertStudent = new SqlCommand(insertStudentQuery, conn, transaction);
                        cmdInsertStudent.Parameters.AddWithValue("@ClassId", classModel.Id);
                        cmdInsertStudent.Parameters.AddWithValue("@StudentId", studentId);
                        int studentRowsInserted = cmdInsertStudent.ExecuteNonQuery();
                        System.Diagnostics.Debug.WriteLine($"Inserted {studentRowsInserted} ClassStudents record for ClassId: '{classModel.Id}', StudentId: '{studentId}'");
                    }
                }

                transaction.Commit();
                System.Diagnostics.Debug.WriteLine($"Successfully updated class with ID: '{classModel.Id}'");
                return (true, null);
            }
            catch (SqlException ex)
            {
                System.Diagnostics.Debug.WriteLine($"SQL Error in Update for ID '{classModel.Id}': {ex.Message}, Number: {ex.Number}");
                return (false, $"Database error: {ex.Message}");
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error in Update for ID '{classModel.Id}': {ex.Message}");
                return (false, ex.Message);
            }
        }

        public static bool Delete(string id)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(id))
                {
                    System.Diagnostics.Debug.WriteLine("Delete failed: ID is null or empty.");
                    return false;
                }

                System.Diagnostics.Debug.WriteLine($"Attempting to delete class with ID: '{id}'");

                using var conn = new SqlConnection(GetConnectionString());
                conn.Open();

                var sqlBatch = @"
                    DELETE FROM Messages WHERE ClassId = @Id;
                    DELETE FROM ClassStudents WHERE ClassId = @Id;
                    DELETE FROM Classes WHERE Id = @Id;
                    SELECT @@ROWCOUNT;";
                using var cmd = new SqlCommand(sqlBatch, conn);
                cmd.Parameters.AddWithValue("@Id", id);

                int rowsDeleted = Convert.ToInt32(cmd.ExecuteScalar());
                System.Diagnostics.Debug.WriteLine($"Deleted {rowsDeleted} Classes records for ID: '{id}'");

                if (rowsDeleted == 0)
                {
                    System.Diagnostics.Debug.WriteLine($"Class not found or no rows deleted for ID: '{id}'");
                    return false;
                }

                System.Diagnostics.Debug.WriteLine($"Successfully deleted class with ID: '{id}'");
                return true;
            }
            catch (SqlException ex)
            {
                System.Diagnostics.Debug.WriteLine($"SQL Error in Delete for ID '{id}': {ex.Message}, Number: {ex.Number}");
                return false;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error in Delete for ID '{id}': {ex.Message}");
                return false;
            }
        }
    }
}
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using WebApplication1.Models;

namespace WebApplication1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ClassesController : ControllerBase
    {
        private readonly ILogger<ClassesController> _logger;
        private readonly IConfiguration _configuration;

        public ClassesController(ILogger<ClassesController> logger, IConfiguration configuration)
        {
            _logger = logger;
            _configuration = configuration;
        }

        private string GetConnectionString()
        {
            return _configuration.GetConnectionString("DefaultConnection")
                ?? throw new ArgumentNullException("Connection string 'DefaultConnection' not found.");
        }

        [HttpGet("student/{studentId}")]
        public IActionResult GetClassesByStudentId(string studentId)
        {
            try
            {
                var classes = new List<ClassModel>();
                using var conn = new SqlConnection(GetConnectionString());
                conn.Open();

                var query = @"
                    SELECT C.Id, C.CourseName, C.Description
                    FROM Classes C
                    JOIN ClassStudents CS ON C.Id = CS.ClassId
                    WHERE CS.StudentId = @StudentId";

                using var cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@StudentId", studentId);

                using var reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    var classModel = new ClassModel
                    {
                        Id = reader.GetString(0),
                        CourseName = reader.GetString(1),
                        Description = reader.IsDBNull(2) ? null : reader.GetString(2),
                        StudentIds = ClassModel.GetStudentIdsForClass(reader.GetString(0))
                    };
                    classes.Add(classModel);
                }

                return Ok(classes);
            }
            catch (SqlException ex)
            {
                _logger.LogError(ex, $"SQL Error in GetClassesByStudentId for StudentId: {studentId}, Number: {ex.Number}");
                return StatusCode(500, $"Database error: {ex.Message}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in GetClassesByStudentId for StudentId: {studentId}");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("teacher/{teacherEmail}")]

        public IActionResult GetClassesByTeacherEmail(string teacherEmail)
        {
            try
            {
                using var conn = new SqlConnection(GetConnectionString());
                conn.Open();

                var verifyQuery = "SELECT 1 FROM Users WHERE Email = @Email AND Role = 'teacher'";
                using var verifyCmd = new SqlCommand(verifyQuery, conn);
                verifyCmd.Parameters.AddWithValue("@Email", teacherEmail.ToLower());

                var isTeacher = verifyCmd.ExecuteScalar() != null;
                if (!isTeacher)
                {
                    _logger.LogWarning($"Teacher not found for Email: {teacherEmail}");
                    return NotFound("Teacher not found with the specified email");
                }

                var classes = ClassModel.GetByTeacherEmail(teacherEmail.ToLower(), conn);
                return Ok(classes);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in GetClassesByTeacherEmail for Email: {teacherEmail}");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }


        [HttpGet]
        public IActionResult GetAllClasses()
        {
            try
            {
                var classes = ClassModel.GetAll();
                return Ok(classes);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetAllClasses");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("{id}")]
        public IActionResult GetClassById(string id)
        {
            try
            {
                var classModel = ClassModel.GetById(id);
                if (classModel == null)
                {
                    return NotFound();
                }
                return Ok(classModel);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in GetClassById for Id: {id}");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPost]
        public IActionResult CreateClass([FromBody] ClassCreateRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var classModel = new ClassModel
                {
                    Id = request.Id,
                    CourseName = request.CourseName,
                    TeacherEmail = request.TeacherEmail,
                    Description = request.Description,
                    StudentIds = request.StudentIds ?? new List<string>()
                };

                var (success, error) = ClassModel.Create(classModel, request.StudentIds);
                if (!success)
                {
                    return BadRequest(error);
                }

                return CreatedAtAction(nameof(GetClassById), new { id = request.Id }, classModel);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in CreateClass for ClassId: {request.Id}");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPut("{id}")]
        public IActionResult UpdateClass(string id, [FromBody] ClassModel classModel)
        {
            try
            {
                if (id != classModel.Id)
                {
                    return BadRequest("ID mismatch");
                }

                var (success, error) = ClassModel.Update(classModel);
                if (!success)
                {
                    return NotFound(error);
                }

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in UpdateClass for Id: {id}");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpDelete("{id}")]
        public IActionResult DeleteClass(string id)
        {
            try
            {
                using var conn = new SqlConnection(GetConnectionString());
                conn.Open();
                _logger.LogInformation($"Attempting to delete class with ID: {id}");

                var verifyQuery = "SELECT 1 FROM Classes WHERE Id = @Id";
                using var verifyCmd = new SqlCommand(verifyQuery, conn);
                verifyCmd.Parameters.AddWithValue("@Id", id);

                var exists = verifyCmd.ExecuteScalar() != null;
                if (!exists)
                {
                    _logger.LogWarning($"Class not found with ID: {id}");
                    return NotFound("Class not found");
                }

                var deleteClassStudentsQuery = "DELETE FROM ClassStudents WHERE ClassId = @Id";
                using var deleteClassStudentsCmd = new SqlCommand(deleteClassStudentsQuery, conn);
                deleteClassStudentsCmd.Parameters.AddWithValue("@Id", id);
                int classStudentsDeleted = deleteClassStudentsCmd.ExecuteNonQuery();
                _logger.LogInformation($"Deleted {classStudentsDeleted} ClassStudents records for ClassId: {id}");

                var classExamsQuery = "SELECT Id FROM ClassExams WHERE ClassId = @Id";
                using var classExamsCmd = new SqlCommand(classExamsQuery, conn);
                classExamsCmd.Parameters.AddWithValue("@Id", id);
                var classExamIds = new List<int>();
                using var classExamsReader = classExamsCmd.ExecuteReader();
                while (classExamsReader.Read())
                {
                    classExamIds.Add(classExamsReader.GetInt32(0));
                }
                classExamsReader.Close();

                if (classExamIds.Any())
                {
                    var deleteQuestionsQuery = "DELETE FROM Questions WHERE ClassExamId IN (" + string.Join(",", classExamIds) + ")";
                    using var deleteQuestionsCmd = new SqlCommand(deleteQuestionsQuery, conn);
                    int questionsDeleted = deleteQuestionsCmd.ExecuteNonQuery();
                    _logger.LogInformation($"Deleted {questionsDeleted} Questions records for ClassExams: {string.Join(",", classExamIds)}");

                    var deleteClassExamsQuery = "DELETE FROM ClassExams WHERE ClassId = @Id";
                    using var deleteClassExamsCmd = new SqlCommand(deleteClassExamsQuery, conn);
                    deleteClassExamsCmd.Parameters.AddWithValue("@Id", id);
                    int classExamsDeleted = deleteClassExamsCmd.ExecuteNonQuery();
                    _logger.LogInformation($"Deleted {classExamsDeleted} ClassExams records for ClassId: {id}");
                }

                var deleteClassQuery = "DELETE FROM Classes WHERE Id = @Id";
                using var deleteClassCmd = new SqlCommand(deleteClassQuery, conn);
                deleteClassCmd.Parameters.AddWithValue("@Id", id);
                int rowsAffected = deleteClassCmd.ExecuteNonQuery();

                if (rowsAffected == 0)
                {
                    _logger.LogWarning($"No rows deleted for ClassId: {id} (possible race condition)");
                    return StatusCode(500, "Failed to delete class");
                }

                _logger.LogInformation($"Class with ID {id} deleted successfully.");
                return Ok(new { message = "Class deleted successfully", deletedClassId = id });
            }
            catch (SqlException ex)
            {
                _logger.LogError(ex, $"SQL Error in DeleteClass for Id: {id}, Number: {ex.Number}, Message: {ex.Message}, StackTrace: {ex.StackTrace}");
                return StatusCode(500, $"Database error: {ex.Message} (Error Number: {ex.Number})");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in DeleteClass for Id: {id}, Message: {ex.Message}, StackTrace: {ex.StackTrace}");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPost("{classId}/messages")]
        public IActionResult SendMessageToClass(string classId, [FromBody] SendMessageRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var (success, error) = MessageModel.CreateMessages(classId, request.TeacherEmail, request.MessageText);
                if (!success)
                {
                    _logger.LogError($"Error sending message to ClassId: {classId}, Error: {error}");
                    return BadRequest(error);
                }

                return Ok("Message sent successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in SendMessageToClass for ClassId: {classId}");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("{classId}/messages")]
        public IActionResult GetMessagesForClass(string classId, [FromQuery] string teacherEmail)
        {
            try
            {
                if (string.IsNullOrEmpty(teacherEmail))
                {
                    return BadRequest("TeacherEmail is required");
                }

                var (success, messages, error) = MessageModel.GetMessagesByClassAndTeacher(classId, teacherEmail);
                if (!success)
                {
                    _logger.LogError($"Error fetching messages for ClassId: {classId}, Error: {error}");
                    return BadRequest(error);
                }

                return Ok(messages);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in GetMessagesForClass for ClassId: {classId}");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("messages/student/{studentId}")]
        public IActionResult GetMessagesForStudent(string studentId)
        {
            try
            {
                if (string.IsNullOrEmpty(studentId))
                {
                    return BadRequest("StudentId is required");
                }

                var (success, messages, error) = MessageModel.GetMessagesByStudent(studentId);
                if (!success)
                {
                    _logger.LogError($"Error fetching messages for StudentId: {studentId}, Error: {error}");
                    return BadRequest(error);
                }

                return Ok(messages);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in GetMessagesForStudent for StudentId: {studentId}");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("student/{studentId}/exams")]
        public IActionResult GetExamsByStudentId(string studentId)
        {
            try
            {
                if (string.IsNullOrEmpty(studentId))
                {
                    _logger.LogWarning("Invalid studentId: null or empty");
                    return BadRequest("StudentId is required");
                }

                using var conn = new SqlConnection(GetConnectionString());
                conn.Open();
                _logger.LogInformation($"Connected to database for StudentId: {studentId}");

                var classQuery = @"
                    SELECT C.Id 
                    FROM Classes C
                    JOIN ClassStudents CS ON C.Id = CS.ClassId
                    WHERE CS.StudentId = @StudentId";

                var classIds = new List<string>();
                using var classCmd = new SqlCommand(classQuery, conn);
                classCmd.Parameters.AddWithValue("@StudentId", studentId);

                using var classReader = classCmd.ExecuteReader();
                while (classReader.Read())
                {
                    classIds.Add(classReader.GetString(0));
                }
                classReader.Close();

                if (!classIds.Any())
                {
                    _logger.LogInformation($"No classes found for StudentId: {studentId}");
                    return Ok(new List<ExamResponse>()); // No classes, return empty list
                }

                _logger.LogInformation($"Found {classIds.Count} classes for StudentId: {studentId}");

                var query = @"
                    SELECT DISTINCT 
                        E.ExamId, 
                        E.Title, 
                        E.ExamDate, 
                        E.Course, 
                        E.Time, 
                        E.Description, 
                        CE.ClassId,
                        (SELECT COUNT(DISTINCT CS.StudentId) 
                         FROM ClassStudents CS 
                         WHERE CS.ClassId = CE.ClassId) AS StudentsAssigned
                    FROM Exams E
                    INNER JOIN ClassExams CE ON E.ExamId = CE.ExamId
                    WHERE CE.ClassId IN (" + string.Join(",", classIds.Select((_, i) => $"@ClassId{i}")) + ")";

                using var cmd = new SqlCommand(query, conn);
                for (int i = 0; i < classIds.Count; i++)
                {
                    cmd.Parameters.AddWithValue($"@ClassId{i}", classIds[i]);
                }

                var exams = new List<ExamResponse>();
                using var reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    exams.Add(new ExamResponse
                    {
                        ExamId = reader.IsDBNull(0) ? 0 : reader.GetInt32(0),
                        Title = reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
                        ExamDate = reader.IsDBNull(2) ? string.Empty : reader.GetDateTime(2).ToString("yyyy-MM-dd"),
                        Course = reader.IsDBNull(3) ? string.Empty : reader.GetString(3),
                        Time = reader.IsDBNull(4) ? string.Empty : reader.GetString(4),
                        Description = reader.IsDBNull(5) ? null : reader.GetString(5),
                        ClassId = reader.IsDBNull(6) ? string.Empty : reader.GetString(6),
                        StudentsAssigned = reader.IsDBNull(7) ? 0 : reader.GetInt32(7)
                    });
                }

                _logger.LogInformation($"Fetched {exams.Count} exams for StudentId: {studentId}");
                return Ok(exams);
            }
            catch (SqlException ex)
            {
                _logger.LogError(ex, $"SQL Error in GetExamsByStudentId for StudentId: {studentId}, Number: {ex.Number}");
                return StatusCode(500, $"Database error: {ex.Message}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in GetExamsByStudentId for StudentId: {studentId}");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("teacher/{teacherEmail}/exams")]
        public IActionResult GetExamsByTeacherClasses(string teacherEmail)
        {
            try
            {
                using var conn = new SqlConnection(GetConnectionString());
                conn.Open();

                var verifyQuery = "SELECT 1 FROM Users WHERE Email = @Email AND Role = 'teacher'";
                using var verifyCmd = new SqlCommand(verifyQuery, conn);
                verifyCmd.Parameters.AddWithValue("@Email", teacherEmail.ToLower());

                var isTeacher = verifyCmd.ExecuteScalar() != null;
                if (!isTeacher)
                {
                    _logger.LogWarning($"Teacher not found for Email: {teacherEmail}");
                    return NotFound("Teacher not found with the specified email");
                }

                var classIds = ClassModel.GetAll().Select(c => c.Id).ToList();

                if (!classIds.Any())
                {
                    return Ok(new List<ExamResponse>());
                }

                var query = @"
                    SELECT DISTINCT 
                        E.ExamId, 
                        E.Title, 
                        E.ExamDate, 
                        E.Course, 
                        E.Time, 
                        E.Description, 
                        CE.ClassId,
                        (SELECT COUNT(DISTINCT CS.StudentId) 
                         FROM ClassStudents CS 
                         WHERE CS.ClassId = CE.ClassId) AS StudentsAssigned
                    FROM Exams E
                    INNER JOIN ClassExams CE ON E.ExamId = CE.ExamId
                    WHERE CE.ClassId IN (" + string.Join(",", classIds.Select((_, i) => $"@ClassId{i}")) + ")";

                using var cmd = new SqlCommand(query, conn);
                for (int i = 0; i < classIds.Count; i++)
                {
                    cmd.Parameters.AddWithValue($"@ClassId{i}", classIds[i]);
                }

                var exams = new List<ExamResponse>();
                using var reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    exams.Add(new ExamResponse
                    {
                        ExamId = reader.GetInt32(0),
                        Title = reader.GetString(1),
                        ExamDate = reader.IsDBNull(2) ? string.Empty : reader.GetDateTime(2).ToString("yyyy-MM-dd"),
                        Course = reader.GetString(3),
                        Time = reader.GetString(4),
                        Description = reader.IsDBNull(5) ? null : reader.GetString(5),
                        ClassId = reader.GetString(6),
                        StudentsAssigned = reader.GetInt32(7)
                    });
                }
                reader.Close();

                return Ok(exams);
            }
            catch (SqlException ex)
            {
                _logger.LogError(ex, $"SQL Error in GetExamsByTeacherClasses for Email: {teacherEmail}, Number: {ex.Number}");
                return StatusCode(500, $"Database error: {ex.Message}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in GetExamsByTeacherClasses for Email: {teacherEmail}");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        public class ExamResponse
        {
            public int ExamId { get; set; }
            public string Title { get; set; } = string.Empty;
            public string ExamDate { get; set; } = string.Empty;
            public string Course { get; set; } = string.Empty;
            public string Time { get; set; } = string.Empty;
            public string? Description { get; set; }
            public string ClassId { get; set; } = string.Empty;
            public int StudentsAssigned { get; set; }
        }

        public class SendMessageRequest
        {
            [Required]
            public string TeacherEmail { get; set; } = string.Empty;

            [Required]
            public string MessageText { get; set; } = string.Empty;
        }
    }

    public class ClassCreateRequest
    {
        [Required]
        public string Id { get; set; } = string.Empty;

        [Required]
        public string CourseName { get; set; } = string.Empty;

        [Required]
        public string TeacherEmail { get; set; } = string.Empty;

        public string? Description { get; set; }

        public List<string> StudentIds { get; set; } = new List<string>();
    }
}
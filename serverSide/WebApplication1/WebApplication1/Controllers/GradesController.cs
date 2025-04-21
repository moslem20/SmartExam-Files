using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using WebApplication1.Data;
using WebApplication1.Models;

namespace WebApplication1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class GradesController : ControllerBase
    {
        private readonly ExamDbContext _context;

        public GradesController(ExamDbContext context)
        {
            _context = context;
        }

        // GET: api/grades - Get all grades
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Grades>>> GetGrades()
        {
            return await _context.Grades.ToListAsync();
        }

        // GET: api/grades/student/{studentId} - Get grades by Student ID
        [HttpGet("student/{studentId}")]
        public async Task<ActionResult<IEnumerable<Grades>>> GetGradesByStudent(string studentId)
        {
            var studentGrades = await _context.Grades
                .Where(g => g.StudentId == studentId)
                .ToListAsync();

            if (studentGrades == null || studentGrades.Count == 0)
            {
                return NotFound(new { message = "No grades found for this student." });
            }

            return Ok(studentGrades);
        }

        // POST: api/grades - Add a new grade
        [HttpPost]
        public async Task<ActionResult<Grades>> AddGrade(Grades grade)
        {
            _context.Grades.Add(grade);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetGradesByStudent), new { studentId = grade.StudentId }, grade);
        }

        // PUT: api/grades/{id} - Update a grade
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateGrade(int id, [FromBody] Grades updatedGrade)
        {
            if (id != updatedGrade.GradeId)
            {
                return BadRequest(new { message = "Grade ID mismatch." });
            }

            var existingGrade = await _context.Grades.FindAsync(id);
            if (existingGrade == null)
            {
                return NotFound(new { message = "Grade not found." });
            }

            existingGrade.StudentId = updatedGrade.StudentId;
            existingGrade.CourseName = updatedGrade.CourseName;
            existingGrade.Grade = updatedGrade.Grade;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return StatusCode(500, new { message = "Error updating grade. Please try again later." });
            }

            return Ok(new { message = "Grade updated successfully.", updatedGrade = existingGrade });
        }

    }
}

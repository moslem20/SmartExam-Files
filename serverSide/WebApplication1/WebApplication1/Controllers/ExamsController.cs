using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApplication1.Models;

namespace WebApplication1.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ExamsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ExamsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllExams()
        {
            var exams = await _context.Exams.ToListAsync();
            return Ok(exams);
        }

        [HttpGet("today")]
        public async Task<IActionResult> GetTodayExams()
        {
            var today = DateTime.Today;
            var todayExams = await _context.Exams
                .Where(e => e.ExamDate == today)
                .ToListAsync();

            return Ok(todayExams);
        }

        [HttpPost]
        public async Task<IActionResult> AddExam([FromBody] Exam exam)
        {
            if (exam == null) return BadRequest();

            _context.Exams.Add(exam);
            await _context.SaveChangesAsync();
            return Ok(exam);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteExam(int id)
        {
            var exam = await _context.Exams.FindAsync(id);

            if (exam == null)
            {
                return NotFound(new { message = $"No exam found with ID {id}" });
            }

            _context.Exams.Remove(exam);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Exam deleted successfully", deletedExam = exam });
        }

    }

}

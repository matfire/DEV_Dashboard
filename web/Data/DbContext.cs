using Microsoft.EntityFrameworkCore;

namespace web.Models {
	public class WebDbContext : DbContext {
		public WebDbContext(DbContextOptions<WebDbContext> options) : base(options) {

		}
		public DbSet<web.Models.User> User {get;set;}
	}
}
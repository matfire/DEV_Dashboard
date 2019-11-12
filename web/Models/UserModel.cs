using System;
using System.ComponentModel.DataAnnotations;

namespace web.Models {
	public class User {
		public int ID {get; set;}
		public string email {get; set;}

		public string githubToken {get;set;}
		public string googleToken {get; set;}
		public string spotifyToken {get; set;}
		
	}
}
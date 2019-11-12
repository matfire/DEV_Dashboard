using System;

namespace api {
	public class User {
		public int id {get;}
		public string username {get; set;}
		public string email {get; set;}
		public string githubToken {get; set;}
		public string redditToken {get; set;}
	}
}
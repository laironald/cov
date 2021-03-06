App.Views.NewProposal = Backbone.View.extend({
	events: {
		"submit form#assign_proposals": "assignProposal",
	},
	initialize: function() {
		this.enableGo();
	},
	enableGo: function() {
		//disable the go button
		$("form#assign_proposals button").html('Go');	
		$("form#assign_proposals button").attr('disabled',false);			
	},
	disableGo: function() {
		//enable the go button
		$("form#assign_proposals button").html('Please Wait...');	
		$("form#assign_proposals button").attr('disabled',true);	
	},
	assignProposal: function(e) {
		e.preventDefault();		
		if ($("#proposal_nsf_id").val()=='') {
			alert('Please specify one or more proposal ids');
			return;
		}
		this.disableGo();
		$("div#loadstatus div#text").html('Retrieving information');
		$("div#load_help").hide();
		$("div#loadstatus ul#components").hide();
		$("div#loadstatus").show();
		//prepare to load data
		var user_id = $("#user_id").val();
		var nsf_ids = $("#proposal_nsf_id").val().split(',');
//console.log(nsf_ids);	
		var self = this;
		//load all proposals, we need the list to figure out what to update and what to load
		var allloadedproposals = new App.Collections.Proposals();
		allloadedproposals.fetch({
			success: function() {
				//first exclude any proposals that are already in the list
				//filter entire proposal collection by supplied nsf_ids
				var loadedproposals = allloadedproposals.filterbyid(nsf_ids);
//console.log(loadedproposals);
				//second exclude any proposals that are already loaded in the database but are not assigned to this user
				var loaded_nsf_ids = [];
				loadedproposals.each(function(proposal) {
					//save off the id here too
					loaded_nsf_ids.push(proposal.get("nsf_id"));
					
					if ($("#user_id").val()) {
						var users = proposal.get("users");
			//console.log(users);					
						//is this user on the list?
						var found = _.find(users,function(user) {
							return user["id"] == user_id;
						});
						if (!found) {
							//all we will do is assign these
			//console.log(proposal);					
							//get current assignments
							var current = _.map(users, function(user) {
								return user.id.toString();
							});
							current.push(user_id);
							proposal.save({ proposal: { user_ids: current} },{
								success: function() {
									//run the callback
									if (self.options.view && self.options.respondto_update) self.options.view[self.options.respondto_update](proposal);
								}
							});
						}
					}					
				});
				//now we have a list of what we need to go get
				//this is the difference of what we wanted vs. what is already loaded
//console.log(tmp);				
				var load_nsf_ids = _.without(nsf_ids, loaded_nsf_ids);
console.log('load');				
console.log(load_nsf_ids);	
				if (load_nsf_ids.length>0) {
					var loadProposalView = new App.Views.LoadProposal({ el:$("div#loadstatus") });
					loadProposalView.loadProposalData(load_nsf_ids,self,'respondToAssign');		
				} else {
					self.enableGo();
					$("div#loadstatus div#status").html('<p><strong>Success!</strong> Everything loaded and assigned! We didn\'t have to load any data, it was already loaded. If assignments needed updating, we did that.');
					$("div#loadstatus div#status").addClass("alert-success");					
				}			
			}
		});
	},
	respondToAssign: function(status,loaded_data) {
//console.log(status);		
//console.log(loaded_data);
		$("div#loadstatus div#status").addClass("alert");
		if (status=='ok') {
			var user_id = $("#user_id").val();
			//save and add to collection
//			self.createLoadedProposals(self,response["data"],user_id);
			var self = this;
			_.each(loaded_data, function(proposal_data,nsf_id) {
				var proposal = new Proposal();
	//console.log(tmp);								
				proposal.save({ 
					proposal: { 
						'nsf_id': nsf_id, 
						'details': JSON.stringify(proposal_data["details"]), 
						'researchers': JSON.stringify(proposal_data["researchers"]), 
						'topics': JSON.stringify(proposal_data["topics"]), 
						'panels': JSON.stringify(proposal_data["panels"]), 
						'reviewers': JSON.stringify(proposal_data["reviewers"]),
						'reviewerproposals': JSON.stringify(proposal_data["reviewerproposals"]),
						'user_ids': [user_id] 
						} 
					}, {
					success: function(data) {
						//run the callback
						if (self.options.view && self.options.respondto_create) self.options.view[self.options.respondto_create](proposal);
						$("div#loadstatus div#status").html('<p><strong>Success!</strong> Everything loaded and assigned!');
						$("div#loadstatus div#status").addClass("alert-success");
					},
					error: function(data) {
						//update status
						$("div#loadstatus div#status").html('<p><strong>Uh-oh!</strong> Things went wrong during the load, as you can see above. You can try your request again.');
						$("div#loadstatus div#status").addClass("alert-error");
					}
				});
			});		
		} else {
			//update status
			if (_.size(loaded_data)==0){
				$("div#loadstatus div#status").html('<p><strong>Uh-oh!</strong> We didn\'t find any of the propsals you requested. Check those IDs and try again.');
			} else {
				$("div#loadstatus div#status").html('<p><strong>Uh-oh!</strong> Things went wrong during the load, as you can see above. You can try your request again.');
			}
			$("div#loadstatus div#status").addClass("alert-error");
		}
		this.enableGo();									 		
	}
});
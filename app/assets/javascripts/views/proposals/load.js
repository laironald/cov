App.Views.LoadProposal = Backbone.View.extend({
	processLoadProgress: function(component,status,data) {
//console.log(this);		
		this.updateLoadStatus(component,status,data);
		//now check if all loaded
		if (this.isDataLoaded()) {
			var view = this.view;
			var respondto = this.respondto;
			//create records to be updated to the datastore
			//do this by collating the response of all the components
			var loaded_data = {};
			var loadedcomponents = this.loadedcomponents;
			_.each(this.nsf_ids, function(nsf_id) {
				loaded_data[nsf_id] = {};
				loaded_data[nsf_id]["details"] = loadedcomponents["proposals"]["data"][nsf_id];
				loaded_data[nsf_id]["researchers"] = loadedcomponents["researchers"]["data"][nsf_id];
				loaded_data[nsf_id]["topics"] = loadedcomponents["topics"]["data"][nsf_id];
				loaded_data[nsf_id]["panels"] = loadedcomponents["panels"]["data"][nsf_id];
				loaded_data[nsf_id]["reviewers"] = loadedcomponents["reviewers"]["data"][nsf_id];
			});		
//console.log(this.getLoadStatus());				
//console.log(loaded_data);				
			view[respondto](this.getLoadStatus(),loaded_data);
		}
	},
	loadProposalData: function(nsf_ids, view, respondto) {
//console.log(view);		
		this.nsf_ids = nsf_ids;
		this.view = view;
		this.respondto = respondto;
//console.log(this);		
		//prep reciever
		this.loadedcomponents = {};
		$("div#loadstatus div#text").html('Loading information');
		//reset load status
		this.updateLoadStatus('proposals','reset',null);
		this.updateLoadStatus('researchers','reset',null);
		this.updateLoadStatus('topics','reset',null);
		this.updateLoadStatus('panels','reset',null);
		this.updateLoadStatus('reviewers','reset',null);
		$("div#loadstatus ul#components").show();
		//start loads of all the different data components
		this.loadProposals();
		this.loadResearchers();
		this.loadTopics();
		this.loadPanels(); //this will load reviewers
	},
	loadProposals: function() {
		var loaded_data = {};
		var component = 'proposals';
		var self = this;
		//http://128.150.10.70/py/api/panel?pid=1149460
		this.updateLoadStatus('proposals','start',null);
		$.ajax({
			url: apiurl+'prop?id='+self.nsf_ids.join(',')+'&jsoncallback=?',
			dataType: 'JSONP',
			success: function(data) {
				//store data
				_.each(self.nsf_ids, function(nsf_id) {
					//find them all out
					loaded_data[nsf_id] = _.find(data["data"],function(item) {
						return item["nsf_id"]==nsf_id;
					});
				});													
				//ALL DONE! run callback function
				self.processLoadProgress(component, 'ok', loaded_data);
			},
			error: function() {
//console.log('error panels');										
				self.processLoadProgress(component, 'error', loaded_data );
			}
		});									
	},
	loadResearchers: function() {
		var loaded_data = {};
		var component = 'researchers';
		var self = this;
		//http://128.150.10.70/py/api/panel?pid=1149460
		this.updateLoadStatus('researchers','start',null);
		$.ajax({
			url: apiurl+'prop?id='+self.nsf_ids.join(',')+'&page=pi'+'&jsoncallback=?',
			dataType: 'JSONP',
			success: function(data) {
				//store data
				_.each(self.nsf_ids, function(nsf_id) {
					//find them all out
					loaded_data[nsf_id] = _.filter(data["data"],function(item) {
						return $.inArray(nsf_id,item["prop"])!=-1;
					});
				});
				//ALL DONE! run callback function
				self.processLoadProgress(component, 'ok', loaded_data );
			},
			error: function() {
//console.log('error panels');										
				self.processLoadProgress(component, 'error', loaded_data );
			}
		});									
	},
	loadTopics: function() {
		var loaded_data = {};
		var component = 'topics';
		var self = this;
		//http://128.150.10.70/py/api/panel?pid=1149460
		this.updateLoadStatus('topics','start',null);
		$.ajax({
			url: apiurl+'topic?id='+self.nsf_ids.join(',')+'&jsoncallback=?',
			dataType: 'JSONP',
			success: function(data) {
				//store data
				_.each(self.nsf_ids, function(nsf_id) {
					//find them all out
					var topics = _.filter(data["data"],function(item) {
						return item["proposal"]["nsf_id"]==nsf_id;
					});
//console.log(topics[0]["topic"]);											
					loaded_data[nsf_id] = topics[0]["topic"]["id"];
				});
				//ALL DONE! run callback function
				self.processLoadProgress(component, 'ok', loaded_data );
			},
			error: function() {
//console.log('error panels');										
				self.processLoadProgress(component, 'error', loaded_data );
			}
		});									
	},
	loadPanels: function() {
		var loaded_data = {};
		var component = 'panels';
		var self = this;
		//http://128.150.10.70/py/api/panel?pid=1149460
		this.updateLoadStatus('panels','start',null);
		$.ajax({
			url: apiurl+'panel?pid='+self.nsf_ids.join(',')+'&jsoncallback=?',
			dataType: 'JSONP',
			success: function(data) {
				var panels = data["data"];
				//load counts for panel proposals, make a list
				var panel_propids = [];
				_.each(panels, function(panel) {
					panel_propids += panel["prop"];
				});
				$.ajax({
					url: apiurl+'prop?id='+_.uniq(panel_propids).join(',')+'&jsoncallback=?',
					dataType: 'JSONP',
					success: function(data) {						
						var loaded_panels = _.map(panels, function(panel) {
							//now we hae a list, so go get the counts
							var panel_totalawards = 0;
							var panel_totalfunding = 0;
							_.each(panel["prop"], function(prop_ids) {
								//get and store the counts
								_.each(data["data"], function(prop) {
									//find them all out
									if ($.inArray(prop,propids) && prop["status"]["name"]=="award") {
										panel_totalawards++;
										panel_totalfunding += prop["awarded"]["dollar"];
									}
								});
							})
							panel["totalawards"] = panel_totalawards;
							panel["totalfunding"] = panel_totalfunding;
							return panel;
						});
						//store data
						_.each(self.nsf_ids, function(nsf_id) {
							//find them all out
							loaded_data[nsf_id] = _.filter(loaded_panels,function(panel) {
								return $.inArray(nsf_id,panel["prop"])!=-1;
							});
						});
						//ALL DONE! run callback function
						self.processLoadProgress(component, 'ok', loaded_data );									
					},
					error: function() {
						self.processLoadProgress(component, 'error', loaded_data );						
					}
				});				
				//get reviewer data
				self.loadReviewers(panels);
			},
			error: function() {
//console.log('error panels');										
				self.processLoadProgress(component, 'error', loaded_data );
			}
		});									
	},
	loadReviewers: function(panels) {
		var loaded_data = {};
		var component = 'reviewers';
		var self = this;
		//http://128.150.10.70/py/api/user?rid=?
		this.updateLoadStatus('reviewers','start',null);
		//gather a list of the reviewers we have to get information for
		var reviewer_ids = [];
		_.each(panels, function(panel) {
			reviewer_ids += panel["revr"];
		});
		//now go get them
		$.ajax({
			url: apiurl+'user?rid='+_.uniq(reviewer_ids).join(',')+'&jsoncallback=?',
			dataType: 'JSONP',
			success: function(data) {
				var loaded_panels_reviewers = [];
				_.each(panels, function(panel) {
					var loaded_panel_reviewers = {};
					var reviewers = data["data"];
					var reviewers_as_pis = [];
					_.each(reviewers, function(item) {
						if (item["revr"] && $.inArray(item["revr"],panel["revr"])) {
							panels_reviewers_as_pis.push(item["nsf_id"]);
						}
					});
					loaded_panel_reviewers['prop'] = panel["prop"];
					//we have all the reviewers for this panel
					loaded_panel_reviewers['reviewers'] = _.filter(reviewers, function(reviewer) {
						if (reviewer["revr"]) return $.inArray(reviewer["revr"],panel["revr"])!=-1;
						else return $.inArray(reviewer["nsf_id"],panel["revr"])!=-1;
					});
					loaded_panel_reviewers['reviewer_proposals'] = [];
					if (panels_reviewers_as_pis.length>0) {
						//now get the proposal info and topics for the reviewers who are pis
						$.ajax({
							url: apiurl+'user?rid='+_.uniq(panels_reviewers_as_pis).join(',')+'&page=prop'+'&jsoncallback=?',
							dataType: 'JSONP',
							success: function(data) {
								if (data["count"]>0) {
									//we get a list of all the proposal ids, go through and extract them
									//we need them to get topics
									var prop_ids = [];
									_.each(data["data"], function(item) {
										if (item["nsf"]["propose"] && item["nsf"]["propose"]["count"]>0) {
											_.each(item["nsf"]["propose"]["data"],function(prop) {
												prop_ids.push(prop["nsf_id"]);
											});
										}
										if (item["nsf"]["decline"] && item["nsf"]["decline"]["count"]>0) {
											_.each(item["nsf"]["decline"]["data"],function(prop) {
												prop_ids.push(prop["nsf_id"]);
											});
										}
										if (item["nsf"]["award"] && item["nsf"]["award"]["count"]>0) {
											_.each(item["nsf"]["award"]["data"],function(prop) {
												prop_ids.push(prop["nsf_id"]);
											});
										}
									});
									//get the topics for each proposal
									$.ajax({
										url: apiurl+'topic?id='+_.uniq(prop_ids).join(',')+'&jsoncallback=?',
										dataType: 'JSONP',
										success: function(data) {
											var proposals = data["data"];											
											//get the details for each proposal, we need to do this so we can match back to reviewers
											$.ajax({
												url: apiurl+'prop?id='+_.uniq(prop_ids).join(',')+'&page=pi'+'&jsoncallback=?',
												dataType: 'JSONP',
												success: function(data) {
													var loaded_proposals = _.map(proposals,function(proposal) {
														var tmp = {};
														tmp["nsf_id"] = proposal["nsf_id"];
														tmp["topics"] = proposal["topic"]["id"];
														//attach the researchers
														var researchers = _.filter(data["data"],function(item) {
															return $.inArray(proposal["nsf_id"],item["prop"])!=-1;
														});
														//extract the researcher ids
														var researcher_ids = [];
														_.each(researchers, function(researcher) {
															researcher_ids.push(researchers["nsf_id"]);
														});
														tmp["researchers"] = researcher_ids;
														return tmp;
													});
													//now we have the loaded proposals with researchers and topics! PHEW!!
													//ok, now associate them back with their appropriate PANELS! NOT Reviewers. We could do that but there might be dups then + it would take up extra storage and we're only storing as entire objects right now, so until we have/need to do things differently (doing the more granular storage here and letting the display parse/display as necessary) and since we only currently care about displaying them as a collection and not individually for each reviewer. If that changes in the future, change this below
													//For each of the panels, using the list of reviewers as pis, find the matching proposals in the list of loaded proposals
													var loaded_reviewer_proposals = [];
													_.each(panel["revr"], function(reviewer) {
														loaded_reviewer_proposals += _.filter(loaded_proposals, function(loaded_proposal) {
															return  $.inArray(reviewer,loaded_proposals["researchers"])!=-1;
														});
														//YES! FINALLY! We have our list of proposals by reviewers who were assigned to this panel!
													});
													loaded_panel_reviewers['reviewer_proposals'] = loaded_reviewer_proposals;
												},
											});
										},
									});
								}
							}
						});												
					}
					loaded_panels_reviewers.push(loaded_panel_reviewers);
				});
				//store data
				_.each(self.nsf_ids, function(nsf_id) {
					//pull out something that looks like this
					//{ panel_id: panel_id, reviewers: reviewers, reviewer_proposals: reviewer_proposals }
					//in each case, we need to be able to find a match between the requested nsf_id being loaded and the corresponding panel it matched to
					var tmp = _.filter(loaded_panels_reviewers,function(loaded_reviewers) {
						return $.inArray(nsf_id,panel["prop"])!=-1;
					});
					//now clear out the 
					loaded_data[nsf_id] = _.map(tmp, function(item) {
						return { 'panel_id': item['panel_id'], 'reviewers': item['reviewers'], 'reviewer_proposals': item['reviewer_proposals'] };
					});
				});
				//ALL DONE! run callback function
				self.processLoadProgress(component, 'ok', loaded_data );									
			},
			error: function() {
				self.processLoadProgress(component, 'error', loaded_data );
			}
		});		
	},
	updateLoadStatus: function(component,status,data) {
		if (!this.loadedcomponents[component]) this.loadedcomponents[component] = {};
		this.loadedcomponents[component]['status'] = status;
		this.loadedcomponents[component]['data'] = data;
		var elem = $("div#loadstatus li#"+component);
		if (status=='reset') {
			$("i", elem).removeClass('icon-ok');
			$("i", elem).removeClass('icon-exclamation-sign');
			$("i", elem).addClass('icon-cog');
			$("span[class^=label]", elem).removeClass('label-success');
			$("span[class^=label]", elem).removeClass('label-important');
			$("span[class=status]", elem).html('Pending');
			$("div#loadstatus div#progressbar").width('0%');
		} else if (status=='start') {
			$("span[class^=label]", elem).addClass('label-info');
			$("span[class=status]", elem).html('Loading');			
		} else if (status=='ok') {
			$("span[class=status]", elem).html('Done');
			$("i", elem).removeClass('icon-cog');
			$("i", elem).addClass('icon-ok');
			$("span[class^=label]", elem).removeClass('label-info');
			$("span[class^=label]", elem).addClass('label-success');			
		} else if (status=='error') {
			$("span[class=status]", elem).html('Error');
			$("i", elem).removeClass('icon-cog');
			$("i", elem).addClass('icon-exclamation-sign');
			$("span[class^=label]", elem).removeClass('label-info');
			$("span[class^=label]", elem).addClass('label-important');			
		}
	},
	isDataLoaded: function() {
		//make sure all the components are loaded
		//now if all components are loaded, proceed!
		if ((this.loadedcomponents["proposals"]["status"]=='ok'||this.loadedcomponents["proposals"]["status"]=='error')
			&&(this.loadedcomponents["topics"]["status"]=='ok'||this.loadedcomponents["topics"]["status"]=='error')
			&&(this.loadedcomponents["researchers"]["status"]=='ok'||this.loadedcomponents["researchers"]["status"]=='error')
			&&(this.loadedcomponents["panels"]["status"]=='ok'||this.loadedcomponents["panels"]["status"]=='error')
			&&(this.loadedcomponents["reviewers"]["status"]=='ok'||this.loadedcomponents["reviewers"]["status"]=='error')
		)
			return true;
		else
			return false;
	},
	getLoadStatus: function() {
		if (this.loadedcomponents["proposals"]["status"]=='error'
			||this.loadedcomponents["topics"]["status"]=='error'
			||this.loadedcomponents["researchers"]["status"]=='error'
			||this.loadedcomponents["panels"]["status"]=='error'
			||this.loadedcomponents["reviewers"]["status"]=='error'
		)
			return 'error';
		else
			return 'ok';
		
	}
});
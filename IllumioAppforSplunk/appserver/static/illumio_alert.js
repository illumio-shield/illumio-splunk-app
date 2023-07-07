require(["splunkjs/mvc/utils"], function (SplunkUtil) {
	var app_name = SplunkUtil.getCurrentApp();
	require.config({
		paths: {
			'jquery_illumio': '../app/' + app_name + '/js/jquery_illumio',
			'jquery-ui': '../app/' + app_name + '/js/jquery-ui.min',
			'jquery-multi': '../app/' + app_name + '/js/jquery.autocomplete.multiselect'
		},
		shim: {
			'jquery-ui':
			{
				deps: ['jquery_illumio']
			},
			'jquery-multi':
			{
				deps: ['jquery-ui']
			}
		}
	});

	require(['jquery_illumio',
		'splunkjs/mvc',
		'splunkjs/mvc/searchmanager',
		'jquery-multi',
		'css!../app/' + app_name + '/js/jquery-ui.css',
		'splunkjs/mvc/simplexml/ready!'],
		function ($, mvc, searchManager) {

			var service = mvc.createService();
			var ipListsSelectedValues = {};
			var servicesSelectedValues = {};
			var allServicesData = {};
			var allIPListsData = {};

			// Return the latest configuration
			function reload_confs() 
			{
				var confs = service.configurations({
					owner: "nobody",
					app: "IllumioAppforSplunk"
				});
				return confs;
			}

			// Read macros.conf and populate Alert Pages
			function fetch_macro(alert_name) 
			{
				var confs = reload_confs();

				confs.fetch(function (err, confs) 
				{
					var conf = confs.item("macros");

					conf.fetch(function (err, props) 
					{
						var properties = props.properties();
						for (var i = 0; i < properties.entry.length; i++)
						{
							var macro_name = properties.entry[i].name;
							if (macro_name === "illumio_system_health")
								set_system_health_configuration(properties.entry[i].content.definition);
							else if (macro_name === "illumio_rule_update")
								set_sec_rule_change_configuration(properties.entry[i].content.definition);
							else if (macro_name === "illumio_policy_provisioning")
								set_affected_workload_threshold_configuration(properties.entry[i].content.definition);
							else if (macro_name === "illumio_workload_labeling")
								set_workload_label_change(properties.entry[i].content.definition)
							else if (alert_name === "")
							{
								document.getElementById("alert_name_id").readOnly = false;
								reset_ruleset_update();
							}
							else if (alert_name != null && macro_name === ("illumio_ruleset_update_" + alert_name)) 
								set_ruleset_update_configuration(properties.entry[i].content.definition, alert_name);
						}

					});

				});

			}

			function fetch_and_create_alert(alert_name) 
			{
				var confs = reload_confs();
				confs.fetch(function (err, confs) 
				{
					var conf = confs.item("savedsearches");
					conf.fetch(function (err, props) 
					{
						var found = false;
						var properties = props.properties();
						for (var i = 0; i < properties.entry.length; i++) 
						{
							var savedSearch = properties.entry[i].name;
							if (savedSearch == alert_name) 
							{
								found = true;
								break
							}
						}
						if (!found) 
						{
							create_alert(alert_name);
						}
					});
				});
			}

			// Loads macro based on Alert Type and Alert Name
			function load_macro() 
			{
				var defaultTokens = mvc.Components.get("default");
				var alert_name = defaultTokens.get('alert_name');
				fetch_macro(alert_name);

				defaultTokens.on("change:alert_type", function (model, value) 
				{
					alert_name = defaultTokens.get('alert_type');
					fetch_macro(alert_name);
				});

				defaultTokens.on("change:alert_name", function (model, value) 
				{
					alert_name = defaultTokens.get('alert_name');
					fetch_macro(alert_name);
				});
			}

			function onChangeAlertType() 
			{
				var defaultTokens = mvc.Components.get("default");
				var alertType = defaultTokens.get("alert_type");
				var alertName = defaultTokens.get("alert_name");

				if (alertType != "ruleset_update") 
				{
					fetch_macro(alertType)
				}
				else 
				{
					fetch_macro(alertName)
				}
			}

			$(document).ready(function () 
			{

				// Show/Hide label drop-down
				show_hide_label_dropdown();
				onChangeAlertType();

				var defaultTokens = mvc.Components.get("default");
				
				defaultTokens.on("change:alert_name", function (model, value) 
				{
					var alertName = defaultTokens.get("alert_name").trim();
					// Read the "macros.conf" and load the previous selection in user-inputs
					// Get drop-down value on change
					if (alertName != "") 
					{
						fetch_macro(alertName);
					}
					else 
					{
						reset_ruleset_update()
					}
				});

				defaultTokens.on("change:alert_type", onChangeAlertType);


				$("#submit_button_system_health").click(submit_system_health);
				$("#submit_button_ruleset_update").click(submit_ruleset_update);
				$("#submit_button_sec_rule_change").click(submit_sec_rule_change);
				$("#submit_button_affected_workload").click(submit_affected_workload);
				$("#submit_button_workload_label_update").click(submit_workload_label_change);

				$("#reset_button_system_health").click(reset_system_health);
				$("#reset_button_ruleset_update").click(reset_ruleset_update);
				$("#reset_button_sec_rule_change").click(reset_sec_rule_change);
				$("#reset_button_affected_workload").click(reset_affected_workload);
				$("#reset_button_workload_label_update").click(reset_workload_label_change);
			});

			// System Health Alert Configuration
			function submit_system_health() 
			{

				// Get the saved config
				var sev_warning = document.getElementById("sev_warning").checked;
				var sev_error = document.getElementById("sev_error").checked;
				var sev_critical = document.getElementById("sev_critical").checked;

				// Create macro definition
				if (!sev_warning && !sev_error && !sev_critical) {
					$('#illumio_system_health_status_msg').html("<font class=\'fail\'>Please select at least one option.</font>");
					return
				}
				var system_health = []
				if (sev_warning)
					system_health.push("severity=warning");
				if (sev_error)
					system_health.push("severity=err");
				if (sev_critical)
					system_health.push("severity=crit");
				var system_health_macro_definition = "(" + system_health.join(' OR ') + ")";

				// Update macro
				update_macro("illumio_system_health", system_health_macro_definition, "illumio_system_health_status_msg");
			}

			// Rule Set Writing/Update Alert Configuration
			function submit_ruleset_update() 
			{

				// Get the saved config
				var defaultTokens = mvc.Components.get("default");
				var alertName = defaultTokens.get("alert_name");
				var is_ruleset_create = document.getElementById("ruleset_create").checked;
				var is_ruleset_update = document.getElementById("ruleset_update").checked;
				var is_ruleset_delete = document.getElementById("ruleset_delete").checked;
				var all_app = document.getElementById("all_app").checked;
				var all_loc = document.getElementById("all_loc").checked;
				var all_env = document.getElementById("all_env").checked;
				var custom_label = document.getElementById("custom_label").checked;
				var alert_name = document.getElementById("alert_name_id").value.trim();
				var join_condition = document.getElementById("ruleset_AND").checked ? " AND " : " OR "
				var label_filter = [];
				var wrong_label_type_flag = 0;
				var wrong_label_without_colon_flag = 0;

				// validate the selection
				if (!alert_name || alert_name == "") 
				{
					$('#illumio_ruleset_update_status_msg').html("<font class=\'fail\'>Please enter the Alert Name.</font>");
					return
				}

				else if (alert_name.length > 120) {
					$('#illumio_ruleset_update_status_msg').html("<font class=\'fail\'>Alert name should be at most 120 characters.</font>");
					return
				}

				else if (!alert_name.match(/^[a-z0-9_]+$/i)) {
					$('#illumio_ruleset_update_status_msg').html("<font class=\'fail\'>Only alphanumeric characters and  '_' are allowed in Alert Name.</font>");
					return
				}

				if (!is_ruleset_create && !is_ruleset_update && !is_ruleset_delete) {
					$('#illumio_ruleset_update_status_msg').html("<font class=\'fail\'>Please select at least one rule set change.</font>");
					return;
				}
				
				if (!all_app && !all_loc && !all_env && !custom_label) 
				{
					$('#illumio_ruleset_update_status_msg').html("<font class=\'fail\'>Please select at least one option.</font>");
					return
				}

				// Get selected labels
				$.each($('#custom_label_id').parent().find('.ui-autocomplete-multiselect-item'), function (index, row) 
				{
					let label = row.textContent.split(/:(.+)/);
					// Escape " while saving 
					let combined_key_value = row.textContent.replace(/"/g, '\\"');
					let label_type = label[0];
					let label_value = label[1];
		
					label_filter.push("(combined_key_value=\"" + combined_key_value + "\")");

					if(label.length == 1 || label_value.trim() == "")
					{
						wrong_label_without_colon_flag += 1

					}
					if(label_type != "app" && label_type != "loc" && label_type != "role" && label_type != "env")
					{
						wrong_label_type_flag += 1
					}
				});
				if (custom_label && label_filter.length == 0) 
				{
					$('#illumio_ruleset_update_status_msg').html("<font class=\'fail\'>Please select at least one option in custom label.</font>");
					return
				}

				if (custom_label && (wrong_label_without_colon_flag != 0 || wrong_label_type_flag != 0))
				{
					$('#illumio_ruleset_update_status_msg').html("<font class=\'fail\'>Label must be in format of type:value and type must be from app, loc, env and role.</font>");
					return
				}

				var custom_label_search = label_filter.join(join_condition);
				var ruleset_update = [];
				var ruleset_change = [];

				// Create macro definition
				if (is_ruleset_create)
					ruleset_change.push("event_type=\"rule_set.create\"");
				if (is_ruleset_update)
					ruleset_change.push("event_type=\"rule_set.update\"");
				if (is_ruleset_delete)
					ruleset_change.push("event_type=\"rule_sets.delete\"");

				var ruleset_update_macro_definition = "(" + ruleset_change.join(' OR ') + ")";

				if (custom_label)
					ruleset_update_macro_definition += " AND (" + custom_label_search + ")"
				if (all_app || all_loc || all_env)
					ruleset_update_macro_definition += " | where isnull(key)";
				
				if (all_app)
					ruleset_update.push("key!=\"app\"");
				if (all_loc)
					ruleset_update.push("key!=\"loc\"");
				if (all_env)
					ruleset_update.push("key!=\"env\"");
				
				if (ruleset_update.length > 0)
					ruleset_update_macro_definition += " OR (" + ruleset_update.join(' AND ') + ")";
				// Update macro
				create_ruleset_macro("illumio_ruleset_update_" + alert_name, ruleset_update_macro_definition, "illumio_ruleset_update_status_msg");
				// Create new alert
				if (alertName == "") 
				{
					alert_name = "illumio_ruleset_update_" + alert_name;
					fetch_and_create_alert(alert_name);
				}
			}

			// Sec Rule Change Alert Configurationr5t
			function submit_sec_rule_change() 
			{
				var sec_rule_create = document.getElementById("sec_rule_create").checked;
				var sec_rule_update = document.getElementById("sec_rule_update").checked;
				var sec_rule_delete = document.getElementById("sec_rule_delete").checked;
				var join_condition =  document.getElementById("rule_AND").checked ? " AND " : " OR ";
				var all_worklaods = document.getElementById("all_worklaods").checked;
				var all_services = document.getElementById("all_services").checked;
				var any_consumers = document.getElementById("any_consumers").checked;

				if (!sec_rule_create && !sec_rule_update && !sec_rule_delete) 
				{
					$('#illumio_sec_rule_change_status_msg').html("<font class=\'fail\'>Please select at least one rule change.</font>");
					return
				}
				if (!all_worklaods && !all_services && !any_consumers) 
				{
					$('#illumio_sec_rule_change_status_msg').html("<font class=\'fail\'>Please select at least one operation.</font>");
					return
				}
				// Create macro definition
				var rule_change = [];
				var rule_operation = [];
				var services_operation = [];
				var ip_lists_operation = [];
				if (sec_rule_create)
					rule_change.push("event_type=\"sec_rule.create\"");
				if (sec_rule_update)
					rule_change.push("event_type=\"sec_rule.update\"");
				if (sec_rule_delete)
					rule_change.push("event_type=\"sec_rule.delete\"");

				if (all_worklaods) 
				{
					rule_operation.push("actors=ams");
				}
				if (all_services) 
				{
					// Check if atleast one value from dropdown is selected
					if (Object.keys(servicesSelectedValues).length === 0) {
						$('#illumio_sec_rule_change_status_msg').html("<font class=\'fail\'>Please select at least one value from dropdown.</font>");
						return;
					}

					for (let key in servicesSelectedValues) 
					{
						services_operation.push('href="' + servicesSelectedValues[key] + '"');
					}
					
				}
				if (any_consumers) 
				{
					// Check if atleast one value from dropdown is selected
					if (Object.keys(ipListsSelectedValues).length === 0) {
						$('#illumio_sec_rule_change_status_msg').html("<font class=\'fail\'>Please select at least one value from dropdown.</font>");
						return;
					}

					for (let key in ipListsSelectedValues) {
						ip_lists_operation.push('href="' + ipListsSelectedValues[key] + '"');
					}

				}
				if (services_operation.length) {
					rule_operation.push("(" + services_operation.join(join_condition) + ")");
				}

				if (ip_lists_operation.length) {
					rule_operation.push("(" + ip_lists_operation.join(join_condition) + ")");
				}
				

				var sec_rule_change_macro_definition = "(" + rule_change.join(' OR ') + ") AND " + "(" + rule_operation.join(' OR ') + ")";

				// Update macro
				update_macro("illumio_rule_update", sec_rule_change_macro_definition, "illumio_sec_rule_change_status_msg");
			}


			// Policy Provisioning Alert Configuration
			function submit_affected_workload() 
			{

				// Get the saved config
				var workloads_threshold = document.getElementById("workloads_threshold").value.trim();
				var isValuePercentage = 0;

				if (workloads_threshold.slice(-1) == '%') {
					workloads_threshold = workloads_threshold.slice(0,-1);
					isValuePercentage = 1
				}

				if (!workloads_threshold) 
				{
					$('#illumio_affected_workload_status_msg').html("<font class=\'fail\'>Threshold value can't be blank.</font>");
					return
				}

				if (isNaN(workloads_threshold) || workloads_threshold < 0) {
					$('#illumio_affected_workload_status_msg').html("<font class=\'fail\'>Threshold value must be a positive integer or percentage.</font>");
					return
				}

				if (isValuePercentage) {
					workloads_threshold += "%";
				}

				else {
					workloads_threshold = Math.round(workloads_threshold).toString();
				}

				var workloads_threshold_macro_definition =  '"' + workloads_threshold + '"';

				// Update macro
				update_macro("illumio_policy_provisioning", workloads_threshold_macro_definition, "illumio_affected_workload_status_msg");
			}

			// Workload Labeling Alert Configuration
			function submit_workload_label_change() 
			{
				var workload_added = document.getElementById("workload_added").checked;
				var workload_updated = document.getElementById("workload_updated").checked;
				var workload_deleted = document.getElementById("workload_deleted").checked;
				var workload_labels = document.getElementById("workload_label").checked;
				var join_condition = document.getElementById("workload_AND").checked ? " AND " : " OR "
				var label_filter = []
				var workload_label_update_macro_definition = ""

				if (!workload_added && !workload_deleted && !workload_updated) 
				{
					$('#illumio_workload_label_update_status_msg').html("<font class=\'fail\'>Please select at least one workload label action.</font>");
					return
				}

				// Create macro definition
				var workload_label_change = [];
				var wrong_label_type_flag = 0;
				var wrong_label_without_colon_flag = 0;
				if (workload_added)
					workload_label_change.push("event_type=\"workload.create\"");
				if (workload_updated)
					workload_label_change.push("event_type=\"workload.update\"");
				if (workload_deleted)
					workload_label_change.push("(event_type=\"workload.delete\" AND changes_labels_deleted=\"*\")")

				// Get selected labels
				$.each($('#workload_label_id').parent().find('.ui-autocomplete-multiselect-item'), function (index, row) 
				{
					let label = row.textContent.split(/:(.+)/);
					// Escape " while saving 
					let combined_key_value = row.textContent.replace(/"/g, '\\"');
					let label_type = label[0];
					let label_value = label[1];

					label_filter.push("(combined_key_value=\"" + combined_key_value + "\")");
					if(label.length == 1 || label_value.trim() == "")
					{
						wrong_label_without_colon_flag += 1

					}
					if(label_type != "app" && label_type != "loc" && label_type != "role" && label_type != "env")
					{
						wrong_label_type_flag += 1
					}
				});
				if (workload_labels && label_filter.length == 0) 
				{
					$('#illumio_workload_label_update_status_msg').html("<font class=\'fail\'>Please select at least one label.</font>");
					return
				}
				if (workload_labels && (wrong_label_without_colon_flag != 0 || wrong_label_type_flag != 0))
				{
					$('#illumio_workload_label_update_status_msg').html("<font class=\'fail\'>Label must be in format of type:value and type must be from app, loc, role and env</font>");
					return
				}
				
				var workload_label_search = label_filter.join(join_condition);
				if (workload_labels)
					workload_label_update_macro_definition += " AND (" + workload_label_search + ")"

				workload_label_change = "(" + workload_label_change.join(" OR ") + ")" + workload_label_update_macro_definition
				// Update macro
				update_macro("illumio_workload_labeling", workload_label_change, "illumio_workload_label_update_status_msg");
			}

			// Reset the user-inputs
			function reset_system_health() 
			{
				document.getElementById("sev_warning").checked = false;
				document.getElementById("sev_error").checked = false;
				document.getElementById("sev_critical").checked = false;
				$("#illumio_system_health_status_msg").html("");
			}

			// Reset the user-inputs
			function reset_ruleset_update() 
			{
				if ($("#alert_name_id").prop("readOnly") === false) 
				{
					document.getElementById("alert_name_id").value = "";
				}

				document.getElementById("all_app").checked = false;
				document.getElementById("all_loc").checked = false;
				document.getElementById("all_env").checked = false;
				document.getElementById("custom_label").checked = false;
				document.getElementById("ruleset_create").checked = false;
				document.getElementById("ruleset_update").checked = false;
				document.getElementById("ruleset_delete").checked = false;
				document.getElementById("ruleset_OR").checked = true;
				$("#custom_label_id").siblings().remove();
				$("#label_filter").hide();
				$("#illumio_ruleset_update_status_msg").html("");
			}

			// Reset the user-inputs
			function reset_sec_rule_change() 
			{
				document.getElementById("sec_rule_create").checked = false;
				document.getElementById("sec_rule_update").checked = false;
				document.getElementById("sec_rule_delete").checked = false;
				document.getElementById("all_worklaods").checked = false;
				document.getElementById("all_services").checked = false;
				document.getElementById("any_consumers").checked = false;
				document.getElementById("rule_OR").checked = true;
				$("#services_id").siblings().remove();
				$("#ip_lists_id").siblings().remove();
				$("#illumio_sec_rule_change_status_msg").html("");
			}

			// Reset the user-inputs
			function reset_affected_workload() 
			{
				document.getElementById("workloads_threshold").value = "";
				$("#illumio_affected_workload_status_msg").html("");
			}

			// Reset the user-inputs for Workload Labeling
			function reset_workload_label_change() 
			{
				document.getElementById("workload_added").checked = false;
				document.getElementById("workload_deleted").checked = false;
				document.getElementById("workload_label_id").checked = false;
				document.getElementById("workload_label").checked = false;
				document.getElementById("workload_OR").checked = true;
				$("#workload_label_id").siblings().remove();
				$("#illumio_workload_label_update_status_msg").html("");
			}

			// Set previous selected user inputs of System Health Alert
			function set_system_health_configuration(macro_definition) 
			{
				reset_system_health();
				if (macro_definition === "()" || macro_definition === "")
					return

				var system_health_map = {
					"WARN": "sev_warning",
					"ERROR": "sev_error",
					"FATAL": "sev_critical"
				}

				var selected_options = macro_definition.substring(1, macro_definition.length - 1).split(' OR');
				for (var i = 0; i < selected_options.length; i++) 
				{
					var option = selected_options[i].split("=")[1].trim();
					document.getElementById(system_health_map[option]).checked = true;
				}
			}

			// Set previous selected user inputs of Rule Set Writing/Update Alert
			function set_ruleset_update_configuration(macro_definition, alert_name) 
			{
				reset_ruleset_update();
				if (macro_definition === "()" || macro_definition === "")
				return
				
				var ruleset_update_map = {
					"app": "all_app",
					"loc": "all_loc",
					"env": "all_env"
				}
				
				var ruleset_change_map = {
					"\"rule_set.create\"": "ruleset_create",
					"\"rule_set.update\"": "ruleset_update",
					"\"rule_sets.delete\"": "ruleset_delete"
				}

				var selectedValues = {};
				var custom_workload_labels = "";
				var custom_label_string = [];
				var event_types = macro_definition.split(" | ")[1];
				var rulesets_actions = macro_definition.split(/AND(.+)/)[0].split(" | ")[0].split(" OR ");

				for (i = 0; i < rulesets_actions.length; i++) {
					action = rulesets_actions[i].trim().split("=")[1];
					
					if (i == rulesets_actions.length - 1) {
						action = action.slice(0,-1);
					}
					if (document.getElementById(ruleset_change_map[action]))
						document.getElementById(ruleset_change_map[action]).checked = true;
				}

				for (let key in ruleset_update_map) 
				{
					if (event_types && event_types.includes(key)) 
					{
						document.getElementById(ruleset_update_map[key]).checked = true;
					}
				}

				var alert_name_id = document.getElementById("alert_name_id")
				alert_name_id.value = alert_name;
				alert_name_id.readOnly = true;
				alert_name_id.style.color = "#3c444d";


				
				custom_workload_labels = (macro_definition.split(" | ")[0]).split(/AND(.+)/);
				
				if (custom_workload_labels.length > 1) {
					custom_label_string = custom_workload_labels[1].split(" OR ");
					document.getElementById("custom_label").checked = true;
					$("#label_filter").show();
				}

				if (custom_label_string[0] != "" && custom_label_string.length == 1) {
					// Check if labels were joined with AND
					var matched = custom_label_string[0].match(/AND/g);

					if (matched && matched.length > 0)
					{
						custom_label_string = custom_label_string[0].split(") AND (");
						document.getElementById("ruleset_AND").checked = true;
					}

				}
				var regex_string = '\(combined_key_value="(?<value>((?!"\\)).)*)"\)';
				custom_label_string.forEach(function (item, index) 
				{
					var matched_group = item.match(regex_string)

					if (matched_group != null) 
					{
						var label = item.match(regex_string).groups.value.replace(/\\"/g, '"');
						var label_type = label.split(/:(.+)/);

						if (label_type in selectedValues) 
						{
							selectedValues[label_type].push({ "label": label });
						}
						else 
						{
							selectedValues[label_type] = new Array();
							selectedValues[label_type].push({ "label": label });
						}
					}
					else 
					{
						document.getElementById("custom_label").checked = false;
						$("#label_filter").hide();
					}
				});

				$("#custom_label_id").siblings().remove();
				for (var key in selectedValues) 
				{
					selectedValues[key].forEach(function (item, index) 
					{
						$("<div></div>")
							.addClass("ui-autocomplete-multiselect-item")
							.text(item.label)
							.attr('id', key)
							.append(
								$("<span></span>")
									.addClass("ui-icon ui-icon-close")
									.click(function () {
										var item = $(this).parent();
										delete selectedValues[key];
										item.remove();
									})
							)
							.insertBefore("#custom_label_id.ui-autocomplete-input")
					});

				};
			}

			function set_workload_label_change(macro_definition) {
				reset_workload_label_change();
				if (macro_definition === "()" || macro_definition === "")
					return

				var labelChangeUpdateMap = {
					'"workload.create"': "workload_added",
					'"workload.delete': "workload_deleted",
					'"workload.update"': "workload_updated"
				}

				var workloadCreateAndDelete = macro_definition.split("AND")[0].trim().slice(1,-1).split("OR");
				for (i = 0; i<workloadCreateAndDelete.length; i++) {
					let eventType = workloadCreateAndDelete[i].split("=")[1].trim();
					document.getElementById(labelChangeUpdateMap[eventType]).checked = true;
				}

				var custom_labels = macro_definition.split(/AND(.+)/);
				var join_condition = 0
				if (custom_labels.length > 1)
				{
					custom_label_string = custom_labels[1].trim().split(" OR ");
					if (document.getElementById("workload_deleted").checked) {
						join_condition = 1;
					}
			
					if (custom_label_string[0] != "" && custom_label_string.length == 1) {
						// Check if labels were joined with AND
						var matched = custom_label_string[0].match(/AND/g);
	
						if (matched && matched.length > join_condition)
						{
							custom_label_string = custom_label_string[0].split(") AND (");
							document.getElementById("workload_AND").checked = true;
						}
	
					}
					var workloadChangeSelectedValues = {}
					var regex_string = '\(combined_key_value="(?<value>((?!"\\)).)*)"\)';

					custom_label_string.forEach(function (item, index) 
					{
						var matched_group = item.match(regex_string)
						if (matched_group != null) 
						{	
							document.getElementById("workload_label").checked = true;
							var label = item.match(regex_string).groups.value.replace(/\\"/g, '"');
							var label_type = label.split(/:(.+)/)
							if (label_type in workloadChangeSelectedValues) 
							{
								workloadChangeSelectedValues[label_type].push({ "label": label });
							}
							else 
							{
								workloadChangeSelectedValues[label_type] = new Array();
								workloadChangeSelectedValues[label_type].push({ "label": label });
							}
						}
					});

					// Remove previously selected values if any
					$("#workload_label_id").siblings().remove();

					for (var key in workloadChangeSelectedValues) 
					{
						workloadChangeSelectedValues[key].forEach(function (item, index) 
						{
							$("<div></div>")
								.addClass("ui-autocomplete-multiselect-item")
								.text(item.label)
								.attr('id', key)
								.append(
									$("<span></span>")
										.addClass("ui-icon ui-icon-close")
										.click(function () {
											var item = $(this).parent();
											delete workloadChangeSelectedValues[key];
											item.remove();
										})
								)
								.insertBefore("#workload_label_id.ui-autocomplete-input")
						});
					};
				}
			}

			// Set previous selected user inputs of Sec Rule Change Alert
			function set_sec_rule_change_configuration(macro_definition) 
			{
				reset_sec_rule_change();
				if (macro_definition === "()" || macro_definition === "")
					return
					var sec_rule_change_map = {
						"\"sec_rule.create\"": "sec_rule_create",
						"\"sec_rule.update\"": "sec_rule_update",
						"\"sec_rule.delete\"": "sec_rule_delete",
						"ams": "all_worklaods"
					};
					
				var join_condition = " OR ";
				var services = {};
				var ipLists = {};
				var services_list = [];
				var ip_lists_list = [];

				// Check if labels were joined with AND condition
				var matched = macro_definition.match(/AND/g);
				if (matched.length > 1 )
				{
					join_condition = " AND ";
					document.getElementById("rule_AND").checked = true;
				}

				macro_definition = macro_definition.split(") AND (").join(" OR ");
				var selected_options = macro_definition.substring(1, macro_definition.length - 1).split(' OR');

				for (var i = 0; i < selected_options.length; i++) 
				{
					var option = selected_options[i].trim();
					if (option == "()" || option == "")
						continue;

					if (option.includes("/sec_policy/draft/services")) 
					{
						document.getElementById("all_services").checked = true;
						services_list = option.split(join_condition);

						services_list.forEach( function (item, index) {
							item = item.split("=")[1].trim();
							if (item[item.length - 1] == ")")
								item = item.slice(0,-1);
								if (allServicesData.hasOwnProperty(item))
									services[allServicesData[item]] = item;
						});

					}
					else if (option.includes("/sec_policy/draft/ip_lists")) 
					{
						document.getElementById("any_consumers").checked = true;
						ip_lists_list = option.split(join_condition);

						ip_lists_list.forEach( function (item, index) {
							item = item.split("=")[1].trim();
							if (item[item.length - 1] == ")")
								item = item.slice(0,-1);
								if (allIPListsData.hasOwnProperty(item))
								ipLists[allIPListsData[item]] = item;
						});
						
					}
					else 
					{	
						option = selected_options[i].split("=")[1].trim();
						document.getElementById(sec_rule_change_map[option]).checked = true;
					}
				}

				setRuleChangeDropdown(services, "services_id");
				setRuleChangeDropdown(ipLists, "ip_lists_id");
			}

			function setRuleChangeDropdown(data, multiSelectId) 
			{
				$("#" + multiSelectId + ".ui-autocomplete-input").siblings().remove();
				for (let key in data)
				{
					item = data[key];
					$("<div></div>")
						.addClass("ui-autocomplete-multiselect-item")
						.text(key)
						.attr('id', item)
						.append(
							$("<span></span>")
								.addClass("ui-icon ui-icon-close")
								.click(function ()
								{
									var item = $(this).parent();
									delete data[key];
									item.remove();
								})
						)
						.insertBefore("#" + multiSelectId + ".ui-autocomplete-input");
				}
			}

			// Set previous selected user inputs of Affected Workload Alert
			function set_affected_workload_threshold_configuration(macro_definition)
			{
				reset_affected_workload();
				if (macro_definition === "()" || macro_definition === "")
					return

				var threshold = macro_definition.substring(1, macro_definition.length - 1);
				document.getElementById("workloads_threshold").value = threshold;
			}

			// Create Macro
			function create_ruleset_macro(macro_name, macro_definition, status_id) 
			{
				var confs = reload_confs();
				var promise = new Promise(function (resolve, reject) 
				{
					confs.fetch(function (err, confs) 
					{
						var conf = confs.item("macros");
						conf.fetch(function (err, props) 
						{
							var found = false;
							var properties = props.properties();
							for (var i = 0; i < properties.entry.length; i++) 
							{
								var macro = properties.entry[i].name;
								if (macro == macro_name) 
								{
									found = true;
									break;
								}
							}
							if (!found) 
							{
								confs.post("macros",
									{
										"__stanza": macro_name
									},
									function (error, status) 
									{
										if (error != null || status.status >= 400) 
										{
											reject();
											$('#illumio_ruleset_update_status_msg').html("<font class=\'fail\'>Error creating macro.</font>");
										}
										else resolve();
									});

							}
							else resolve();
						});

					});

				});

				promise.
					then(function () 
					{
						update_macro(macro_name, macro_definition, status_id);
					}).
					catch(function () {
						$('#illumio_ruleset_update_status_msg').html("<font class=\'fail\'>Error creating / updating macro.</font>");
					});
			}

			// Update Macro
			function update_macro(macro_name, macro_definition, status_id) 
			{
				var confs = reload_confs();

				confs.post("macros/" + macro_name,
					{
						definition: macro_definition,
					},
					function (error, status) 
					{
						if (error != null || status.status >= 400)
							$('#' + status_id).html("<font class=\'fail\'>Failed to save.</font>");
						else
							$('#' + status_id).html("<font class=\'success\'>Successfully saved.</font>");
						setTimeout(function () {
							$('#' + status_id).html("");
						}, 3000);
					});

			}

			// Create new alert
			function create_alert(alert_name) 
			{
				var confs = reload_confs();

				confs.post("savedsearches",
					{
						"__stanza": alert_name
					},
					function (error, status) 
					{
						if (error != null || status.status >= 400) 
						{
							if (error != null)
								$('#illumio_ruleset_update_status_msg').html("<font class=\'fail\'>Please change the name of an alert.</font>");
							else
								$('#illumio_ruleset_update_status_msg').html("<font class=\'fail\'>Successfully saved.</font>");
						}
						else 
						{
							confs.post("savedsearches/" + alert_name,
								{
									"alert.digest_mode": 0,
									"alert.suppress": 0,
									"alert.track": 1,
									"counttype": "number of events",
									"cron_schedule": "*/5 * * * *",
									"description": "ruleset update alert",
									"dispatch.earliest_time": "-5m@m",
									"dispatch.latest_time": "now",
									"enableSched": 1,
									"quantity": 0,
									"relation": "greater than",
									"search": "`illumio_get_index` sourcetype=\"illumio:pce\" `illumio_ruleset_update_" + alert_name.slice(23) + "`"
								},
								function (error, status) 
								{
									if (error != null || status.status >= 400)
										$('#illumio_ruleset_update_status_msg').html("<font class=\'fail\'>Failed to save.</font>");
									else {
										$('#illumio_ruleset_update_status_msg').html("<font class=\'success\'>Successfully saved.</font>");
										setTimeout(function () { $("#illumio_ruleset_update_status_msg").html(""); }, 3000);
										var tokens = mvc.Components.get("default");
										tokens.unset("ruleset_change");
										tokens.set("ruleset_change", "");
									}
								});

						}
					});
			}

			// Show/Hide the label dropdown based on the checkbox selection
			function show_hide_label_dropdown() 
			{
				$("#label_filter").hide();

				$("#custom_label").click(function () 
				{
					let is_checked = document.getElementById("custom_label").checked;
					if (is_checked)
						$("#label_filter").show();
					else
						$("#label_filter").hide();
				});

			}

			// Get list of labels to populate drop-down
			var labelQuery = '| inputlookup illumio_workload_mapping_lookup | dedup label, type | table label, type';
			// Get list of ip_lists to populate drop-down
			var ipListsQuery = '| inputlookup illumio_ip_lists_mapping_lookup | dedup name, href | table name, href';
			// Get list of services to populate drop-down
			var servicesQuery = '| inputlookup illumio_services_mapping_lookup | dedup name, href | table name, href';

			// Create Multiselect Dropdowns
			initializeDropdown("labelMultiSearch", labelQuery, "custom_label_id", prepareLabelData, addCustomLabelItem, filterLabels, setLabelSelectedValue);
			initializeDropdown("ipListsMultiSearch", ipListsQuery, "ip_lists_id", prepareRuleChangeData, "", filterRuleChange, setRuleChangeSelectedValue);
			initializeDropdown("servicesMultiSearch", servicesQuery, "services_id", prepareRuleChangeData, "", filterRuleChange, setRuleChangeSelectedValue);
			initializeDropdown("workloadlabelMultiSearch", labelQuery, "workload_label_id", prepareLabelData, addCustomLabelItem, filterLabels, setLabelSelectedValue);

			function initializeDropdown(searchID, query, multiSelectId, prepareData, addItem, filterItems, setSelectedValue) 
			{
				var MultiSelectSearch = new searchManager({
					id: searchID,
					search: query
				});

				MultiSelectSearch.on("search:start", function (properties) {
					$("#" + multiSelectId + "_searchdata").show();
				});

				MultiSelectSearch.on("search:done", function (properties) {
					$("#" + multiSelectId + "_searchdata").hide();

				});
				
				var MultiSelectResult = MultiSelectSearch.data('results', { // get the data from that search
					count: 0 // get all results
				});

				MultiSelectResult.on("data", function () {
					setData(MultiSelectResult.data().rows, multiSelectId, prepareData, addItem, filterItems, setSelectedValue);
					load_macro();
				});

				
			}

			load_macro();

			function setData(data, multiSelectId, prepareData, addItem, filterItems, setSelectedValue) 
			{
				var dataArray = prepareData(data, multiSelectId);
				populateDropdown(multiSelectId, dataArray, addItem);

				$('#' + multiSelectId).click(function (e) { e.preventDefault(); });

				$('#' + multiSelectId).parent().bind("DOMNodeInserted", function (objEvent) {
					selectedValues = setSelectedValue(dataArray, multiSelectId, "");
					filterItems(dataArray, multiSelectId, addItem, selectedValues);
				});

				$('#' + multiSelectId).parent().bind("DOMNodeRemoved", function (objEvent) {
					selectedValues = setSelectedValue(dataArray, multiSelectId, objEvent.target);
					filterItems(dataArray, multiSelectId, addItem, selectedValues);
				});
			}

			function populateDropdown(multiSelectId, dataArray, addItem) 
			{
				$('#' + multiSelectId)
					.autocomplete({
						source: function (request, response) 
						{
							var results = $.ui.autocomplete.filter(dataArray, request.term);
							// Add item to dropdown while typing
							if (addItem != "") 
							{
								results = addItem(request.term.trim(), results, multiSelectId);
							}
							response(results.slice(0, 10));
						},
						minLength: 1,
						multiselect: true
					});
			}

			function prepareLabelData(data) 
			{
				let dataArray = []
				for (let i = 0; i < data.length; i++) 
				{
					dataArray.push({ "label": data[i][1] + ":" + data[i][0], "type": data[i][1] });
				}
				return dataArray;
			}

			function prepareRuleChangeData(data, multiSelectId) 
			{
				let dataArray = [];
				let key
				for (let i = 0; i < data.length; i++) 
				{
					key = '"' + data[i][1] + '"';

					if (multiSelectId == "services_id") 
					{
						allServicesData[key] = data[i][0];
					}
					else 
					{
						allIPListsData[key] = data[i][0];
					}
					dataArray.push({ "label": data[i][0], "href": data[i][1] });
				}
				return dataArray;
			}

			function addCustomLabelItem(inputTerm, results, multiSelectId) 
			{
				// Don't add empty item to dropdown
				if (inputTerm == "") {
					return results;
				}

				let terms = inputTerm.split(":")
				let new_label = inputTerm;
				let new_type = terms[0];
				let new_item = { label: new_label, type: new_type }
				let present = 0;

				// Check if term is already in the results
				$.each(results, function (index, item) {
					if (item.label == new_label && item.type == new_type)
						present = 1;
				});

				// Check if term is already in selected values
				$.each($('#' + multiSelectId).parent().find('.ui-autocomplete-multiselect-item'), function (index, row) 
				{
					if (row.textContent == inputTerm)
					{
						present = 1;
					}
				});

				// Add only if input term is not matched with already selected terms or already populated terms in dropdown
				if (present == 0)
					results.unshift(new_item);
				return results;
			}

			function setLabelSelectedValue(dataArray, multiSelectId, node) 
			{
				let selectedValues = {};

				$.each($('#' + multiSelectId).parent().find('.ui-autocomplete-multiselect-item'), function (index, row) {
					if (node != row) 
					{
						let labelType = row.id, label = row.textContent;
						if (labelType in selectedValues) 
						{
							selectedValues[labelType].push({ "label": label });
						}
						else 
						{
							selectedValues[labelType] = new Array();
							selectedValues[labelType].push({ "label": label });
						}
					}
				});

				return selectedValues;
			}

			function setRuleChangeSelectedValue(dataArray, multiSelectId, node) 
			{
				let selectedValues = {};

				$.each($('#' + multiSelectId).parent().find('.ui-autocomplete-multiselect-item'), function (index, row) {
					if (node != row) 
					{
						filteredArray = dataArray.filter(function (e) {
							return (e.label == row.textContent)
						});
						selectedValues[row.textContent] = filteredArray[0].href;
					}
				});

				// Prepare a dictionary for href to services and ip_lists
				if (multiSelectId == "services_id") 
				{
					servicesSelectedValues = selectedValues;
				}
				else 
				{
					ipListsSelectedValues = selectedValues;
				}

				return selectedValues;
			}

			function filterLabels(dataArray, multiSelectId, addItem, selectedValues) 
			{
				// Filter the selected values from the results
				var filtered = dataArray.filter(function (e) {
					if (selectedValues[e.type]) 
					{
						for (var index = 0; index < selectedValues[e.type].length; index++) 
						{
							if (e.label == selectedValues[e.type][index].label) 
							{
								return null;
							}
						}
					}
					return e;
				});
				populateDropdown(multiSelectId, filtered, addItem);
			}

			function filterRuleChange(dataArray, multiSelectId, addItem, selectedValues) 
			{
				// Filter the selected values from the results
				var filtered = dataArray.filter(function (e) {
					if (selectedValues.hasOwnProperty(e.label)) 
					{
						return null;
					}

					return e;
				});
				populateDropdown(multiSelectId, filtered, addItem);
			}

		});
});
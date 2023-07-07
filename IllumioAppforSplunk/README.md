# OVERVIEW
 
* The Illumio App for Splunk integrates with the Illumio Policy Compute Engine (PCE) to provide security and operational insights into your Illumio secured data center. A dashboard view displays an overview of the security posture of the data center. 
* With improved visibility of east-west traffic, Security Operations Center (SOC) staff can detect unauthorized activity and potential attacks from traffic blocked by Illumio segmentation policy on workloads in "Enforcement" mode. Additionally, the Illumio App for Splunk provides visibility into potentially blocked traffic for workloads in "Test" mode. SOC staff can quickly pinpoint potential attacks and identify workloads with a significant number of blocked flows.
* For CIM support, please install the Illumio Technology Add-On (TA) for Splunk available at https://splunkbase.splunk.com
* Version: 3.2.1
* Supported Splunk versions are 8.1.x and 8.2.x
 * Supported PCE Versions are 17.1, 17.2, 17.3, 18.1, 18.2.0*, 18.2.x, 18.3, 19.1, 19.3, 18.2.0*, 18.2.x, 18.3, 19.1, 19.3, 18.2.0*, 18.2.x, 18.3, 19.1, 19.3, 20.1 and 21.2.x.
* Supported SaaS PCE Version is 21.5.3-3.

# Prerequisites
  * TA-Illumio is required for field extractions and data collection.


# Release Notes  

* **Version 3.2.1**
    * Added support for SaaS PCE.

* **Version 3.2.0**
    * Added below dashboards:
        1) PCE Authentication Events
        2) Traffic Explorer
        3) Change Monitoring  
    * Added below panels in PCE Operations (On-Prem Only) dashboard:
        1) Data Ingestion Volume In The Last Day
        2) Data Ingestion Volume In The Last 30 Days
    * Updated below panels in Workload Investigations dashboard.
        * Removed Traffic Events panel.
        * Added Active VEN, Suspended VEN, Stopped VEN, Policy Enforcement State and Policy Synchronization Status panels.
        * Added Status, Severity and Notification Type filter to the Audit Events panel.
    * Added "Unknown" option on "Security Operations" dashboard's "Traffic" filter.
    * Fixed disk latency issue in "PCE Operations (On-Prem Only)" dashboard's "Cluster Cores" Panel.
    * Bundled the jQuery3 in the app package.
    * Added "Supercluster Leader" filter to all dashboards.
    * Added "illumio_portscan_index" macro to summarize port scan data to custom index.
    * Modified "Illumio_Workload_Mapping" savedsearch so that it clears records older than 30 days in "illumio_workload_mapping_lookup" lookup.

* **Version 3.1.0**
    * Added below panels in PCE Operations dashboard: 
        1) VEN Heartbeat Latency
        2) VEN Policy Latency
        3) Collector Flow Rate 
        4) Traffic Ingest Rate
        5) Policy Database Summary
        6) Disk Latency in Cluster Cores Section
    * Used Basesearch for panels in PCE operations dashboard to improve search performance.
 

* **Version 3.0.0**
    * Splunk 8 Support.
    * Made App Python23 compatible.
    * Changed all queries to datamodel for sourcetype "illumio:pce".
    * Added label filters on Workload Investigation.
    * Added Allowed option on Security Operations.

* **Version: 2.3.0**
    * Added Alert Configuration screen to create/update alert filters.
    * Workload Investigation: Added drilldown from panel Audit Events.
    * Added support of S3 collected data.


* **Version: 2.2.1**
    * Fixed the bug with Quarantine workload from the drill-down of Firewall Tampering panel.
    * Panels using Syslog data, now use pce_fqdn field instead of fqdn field.
    * Auditable event count uses both system events and audit events.
    * In Workload Operations dashboard, changed default time range from 60 minutes to 72 hours.
    * Added 'PCE' column in the drill-down of Firewall Tampering panel.
    * Removed "Illumio_Host_PublicIP_Mapping" and "Illumio_PublicIP_Host_Mapping" saved searches as we are not using host field anymore inside "illumio_host_details_lookup".

* **Version: 2.2.0**
    * Created new dashboard "Workload Investigation".
    * Created new panels "VEN Count", "VEN Event Count By Status", "Agent Event Count By EventType" and "Workload Event Count By EventType" in "Workload Operations" dashboard.
    * Modified panels "Managed VEN by Version", "Managed VEN by Mode" and "Managed VEN by Operating System" in "Workload Operations" dashboard.
    * Updated the logic of "Port Scan" panel.
    * Removed "dnslookup" custom command.

* **Version: 2.1.0**
    * Added support of Illumio PCE 18.3.1, 19.1
    * Updated the search time of single value panels to last 60 minutes with trend line of 24 hours in Security Operations dashboard.
    * Fixed the bug related to "unknown" or "NULL" legend in "Top Workloads with" and "Managed VEN by Operating System" panels.
    * Fixed the bug related to label filter not considering label type while searching for traffic data in Security Operations dashboard.

* **Version: 2.0.2**
    * Added support of Illumio PCE 18.2.1, 18.2.2, 18.2.3

* **Version: 2.0.1**
    * Removed VEN Changes by Type panel from Workload Operations dashboard.

* **Version: 2.0.0**
    * This version of App (2.0.0) is only compatible with Illumio PCE 18.2.0
    * This version of App (2.0.0) is not compatible with Illumio PCE 17.X

# RECOMMENDED SYSTEM CONFIGURATION

* Standard Splunk configuration of Search Head.

# TOPOLOGY AND SETTING UP SPLUNK ENVIRONMENT

* This app has been distributed in two parts.

    1) Add-on app, which listens for Syslog messages from Illumio PCE and collects Illumio metadata using REST API Calls.
    
    2) The main app for visualizing Illumio PCE data.

* This App can be set up in two ways:

  1) __Standalone Mode__:
  
Install the main app and Add-on app.

* Here both the app resides on a single machine.
* The main app uses the data collected by Add-on app and builds dashboard on it.

  2) __Distributed Environment__: 
  
    a) With heavy forwarder

    Install the main app and Add-on app on search head. Add-on app on heavy forwarder.
        
    * Configure Add-on app on heavy forwarder.
    * The main app on search head uses the received data and builds dashboards on it.
            
    b) With Splunk Universal Forwarder

    Install the main app and Add-on app on search head. Add-on app on universal forwarder and indexer.
 
    1. Configure Splunk Universal Forwarder to collect data from Illumio Server.
        * Create TCP stanza in $SPLUNK_HOME/etc/system/local/inputs.conf file.
            ```
            [tcp://<PORT>]
            index=<INDEX-NAME>
            sourcetype=illumio:pce
            ```              
    2. Configure the Splunk Universal Forwarder to send the data to Splunk Indexer.
        * Execute below command on SUF.
     	    * $SPLUNK_HOME/bin/splunk add forward­server <IP>:<PORT> (Splunk Indexer IP and Listening Port)

    3. Configure Splunk Indexer to receive data from SUF.
        * Create below stanza in $SPLUNK_HOME/etc/system/local/inputs.conf file.
            ```
            [splunktcp://<PORT>]
            ```

# INSTALLATION IN SPLUNK CLOUD

* Same as on-premise setup.

# INSTALLATION OF APP

* This app can be installed through UI using "Manage Apps" or from the command line using the following command:
    ```sh
    $SPLUNK_HOME/bin/splunk install app $PATH_TO_SPL/IllumioAppforSplunk.spl/
    ```
* User can directly extract SPL file into $SPLUNK_HOME/etc/apps/ folder.

## UPGRADE

### From v3.2.0 TO v3.2.1
* User needs to rebuild the Data model after upgrading the app. Follow the REBUILDING DATA MODEL section.

**NOTE: Only for SaaS PCE users:**

* If the user has configured the "Illumio_PCE_Health_Alert" alert under the "Alert Configuration" dashboard then the user needs to reconfigure it.

### From v3.1.0 TO v3.2.0
* User needs to rebuild the Data model after upgrading the app. Follow the REBUILDING DATA MODEL section.

### From v3.0.0 TO v3.1.0
* User needs to rebuild the Data model after upgrading the app. Follow the REBUILDING DATA MODEL section.

### From v2.3.0 to v3.0.0
* User needs to rebuild the Data model after upgrading the app. Follow the REBUILDING DATA MODEL section.

# OPEN SOURCE COMPONENTS AND LICENSES

* Some of the components included in Illumio App for Splunk are licensed under free or open source licenses. We wish to thank the contributors to those projects.

* jQuery
    * version: 3.5.0
    * URL: https://jquery.com
    * LICENSE: https://github.com/jquery/jquery/blob/main/LICENSE.txt

* Underscore JS
    * version: 1.6.0
    * URL: http://underscorejs.org
    * LICENSE: https://github.com/jashkenas/underscore/blob/master/LICENSE

* JQuery-ui
    * version: 1.12.1
    * URL: https://jqueryui.com
    * LICENSE:  https://github.com/jquery/jquery-ui/blob/main/LICENSE.txt

* MSelectDialogBox
    * URL: https://github.com/eugenegantz
    * URL: https://github.com/eugenegantz/MSelectDialogBox
    * LICENSE: This jQuery plugin is developed by eugenegantz under MIT License. 

# CUSTOM ROLE 
* We have added the custom role named "illumio_quarantine_workload". You have to assign this role to the user to allow him to mark any workload as Quarantine.

# Alert Configuration
* As part of release v2.3.0, we have added new Alert Configuration screen. User can create and update alert configuration rules for triggered alerts. User can also add/modify filters for specific alert. Below are the list of configuration screen for this feature.
    * PCE System Health Events: User can select the severity for a new system_health messages. Alerts will be triggered when the selected conditions will meet. We have option for selection of different severity like Warning, Error and Critical.
    * Rule Set Writing/Update: If the PCE generates create or update or delete event for specific RuleSet that has a scope contains specific labels for app, loc, env and also selected custom label.
    * Rule Writing Update: If the PCE generates create or update or delete event for specific Rule Providers or Consumers that include any services, iplists or all workloads.
    * Policy Provisioning: PCE generates a Policy Provision Event with number of online Workloads exceeding.
    * Workload Labeling: If the PCE generates create or update or delete event for specific workload with selected labels from the multiselect.

## How to add actions in Alert after adding/updating the criteria from Alert Configuration screen
* If you want to add email action for specific alert then follow below steps:
    * Go to Settings -> Searches, Reports, and Alerts
    * Select App as IllumioAppforSplunk from the dropdown.
    * Search for specific alert and click on Edit->Edit Alert under Actions section.
    * Scroll on the popup and find the Triggered Alerts section.
    * Click on Add Actions and select Send email alert.
    * Configure all parameters for email like To, Subject, Message etc.
    * User can include the filtered events in to PDF format.
    * Click on Save.


# SAVED SEARCHES
This application contains following saved searches, which are used in the dashboards.

* Illumio_Auditable_Events
This saved search is used to fetch data for auditable data and populate "Auditable Events" panel in application dashboard.

* Illumio_PortScan
This saved search is used to fetch port scan data for Illumio_Portscan_Details saved search. This saved search saves data in summary index which increases the disk usage on the indexer but summary indexed data does not count against your total daily indexing volume.

* Illumio_Firewall_Tempering
This saved search is used to fetch firewall tempering data and populate "Firewall Tempering" panel in application dashboard.

* Illumio_Workload_Mapping
This saved search is used to populate "illumio_workload_mapping_lookup" lookup and clear the records older than 30 days.

* Illumio_Portscan_Details
This saved search is used to populate "illumio_portscan_details_lookup" lookup.

* Illumio_Host_Details
This saved search is used to populate "illumio_host_details_lookup" lookup.

* Illumio_Host_PublicIP_Mapping
This saved search is used to find a mapping between public IP and hostname of Illumio nodes.

* Illumio_PublicIP_Host_Mapping
This saved search is used to find hostname for specific public IP of Illumio nodes.

* Illumio_Check_PCE_Collector_Data
This schedule saved search checks if data is being received from the PCE. If no data is received in last five minutes it triggers an alert. By default, this saved search is in disabled mode.

* Illumio_hostname_ip_mapping
This saved search is used to populate  "illumio_hostname_ip_mapping_lookup" lookup.

* Illumio_Host_Details_S3
This saved search is used to populate "illumio_host_details_lookup" lookup for S3 collected data.

* Illumio_PCE_Health_Alert
This saved search is used for PCE System Health Events screen filters.

* Illumio_Rule_Update_Alert
This saved search is used for Rule Writing Update screen filters.

* Illumio_Policy_Provisioning_Alert
This saved search is used for Policy Provisioning screen filters.

* Illumio_Workload_Labeling_Alert
This saved search is used for Workload Labeling screen filters.

 
# DATA MODEL
* The app consist of one data model "Illumio". The acceleration for the data model is disabled by default. If you want to improve the performance of dashboards then enable the data model acceleration.
* The accelerated data models help in improving the performance of the dashboard but it increases the disk usage on the indexer.

# DATA MODEL CONFIGURATION
* The Data Model used in this application is not accelerated. Admin should manually accelerate the Data Model.
* The Data Model used in this application should be accelerated with 1 week's period. Admin can enable/disable acceleration or change the acceleration period by the following steps:
    * On Splunk’s menu bar, Click on Settings -> Data models
    * From the list for Data models, click “Edit” in the "Action" column of the row for the Data model for which acceleration needs to be enabled or disabled.
    * From the list of actions select Edit Acceleration. This will display the pop-up menu for Edit Acceleration.
    * Check or uncheck Accelerate checkbox to "Enable" or "Disable" data model acceleration respectively.
    * If acceleration is enabled, select the summary range to specify acceleration period.
    * To save acceleration changes click on save button.

# REBUILDING DATA MODEL
* In case there is no need to use the already indexed accelerated Data Model, the Data Model can be configured to rebuild from scratch for the specified acceleration period. Data Model can be rebuilt by the following steps:
    * On Splunk’s menu bar, Click on Settings -> Data models.
    * From the list for Data models, expand the row by clicking “>" arrow in the first column of the row for the Data model for which acceleration needs to be rebuild. This will display an extra Data Model information in "Acceleration" section.
    * From the "Acceleration" section click on "Rebuild" link.
    * Monitor the status of "Rebuild" in the field "Status" of "Acceleration" section. Reload the page to get latest rebuild status.

# TROUBLESHOOTING

* If dashboards are not getting populated:
    * Check "illumio_get_index" macro is updated if, you are using the custom index.
    * Check if the data model is accelerated or not.
    * Make sure you have data in given time range.
    * To check data is collected or not, run " `illumio_get_index` | stats count by sourcetype" query in the search.
    * Try expanding TimeRange.
    * Try "<instance_url>/<language>/_bump" endpoint to clear cache and load new static content.
* If sankey diagram is not visualize in Traffic Explorer dashboard's "Communications Map between Labeled Workloads" panel:
    * Be aware that you will need to install the Sankey Diagram App from https://splunkbase.splunk.com/app/3112/
* If the user wants to summarize port scan data to some custom index then update the "illumio_portscan_index" macro as mentioned below:
    *  index = <your_index>
* If label filters (i.e. app, env and loc) are not populated:
    * Try to run the "Illumio_Workload_Mapping" saved search via expanding timerange.
    * Make sure that interval configuration for input is less than 24 hours.

# Known Limitations
* The following dashboards/panels may not be populated for the SaaS PCE data.

| Dashborard Name | Panel |
|--|--|
| PCE Operations (On-Prem Only)| Cluster Status |
| PCE Operations (On-Prem Only)| PCE Run Level |
| PCE Operations (On-Prem Only)| PCE Service Status |
| PCE Operations (On-Prem Only)| Policy Database Summary |
| PCE Operations (On-Prem Only)| Cluster Cores |
| PCE Operations (On-Prem Only)| VEN Panel(s) |
| PCE Operations (On-Prem Only)| Type(s) |

# UNINSTALL APP

To uninstall an app, user can follow below steps: SSH to the Splunk instance -> Go to folder apps ($SPLUNK_HOME/etc/apps) -> Remove the IllumioAppforSplunk folder from apps directory -> Restart Splunk

# EULA

* Custom EULA for Illumio. https://www.illumio.com/splunk-license-agreement

# SUPPORT

* Access questions and answers specific to Illumio App for Splunk at https://answers.splunk.com.
* Support Offered: Yes
* Support Email: splunkapp-support@illumio.com
* Please visit https://answers.splunk.com, and ask your question regarding Illumio App for Splunk. Please tag your question with the correct App Tag, and your question will be attended to.

Copyright 2021 Illumio, Inc. All rights reserved.
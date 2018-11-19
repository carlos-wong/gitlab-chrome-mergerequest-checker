var config = require('./config');
var axios = require('axios');
var lodash = require('lodash');

console.log('extension loaded');

var gitlab_axios_instance = axios.create({
  baseURL: config.api_url,
  timeout: 10000,
  headers: { "PRIVATE-TOKEN": config.token}
});

window.addEventListener ("load", myMain, false);

var mergeBtn;
var acceptBtn;
let removeSourceBranch ;
function myMain () {
  removeSourceBranch = document.querySelector('#remove-source-branch-input');
  mergeBtn = document.querySelector("#content-body > div > div.merge-request-details.issuable-details > div.mr-state-widget.prepend-top-default > div.mr-section-container > div.mr-widget-section > div > div.media-body > div > span > button");
  let mergeSpan;
  mergeSpan = document.querySelector("#content-body > div > div.merge-request-details.issuable-details > div.mr-state-widget.prepend-top-default > div.mr-section-container > div.mr-widget-section > div > div.media-body > div > span");
  console.log('mergeBtn:',mergeBtn,' mergeSpan:',mergeSpan,' removeSourceBranch:',removeSourceBranch);
  if (mergeBtn && mergeSpan && removeSourceBranch){
    removeSourceBranch.checked = true;

    mergeBtn.innerHTML = "";
    mergeBtn.setAttribute("disabled", "disabled");
    acceptBtn = document.createElement("Button");       // Create a <li> node
    acceptBtn.className = mergeBtn.className;
    var textnode = document.createTextNode("Accept");  // Create a text node
    acceptBtn.addEventListener('click', function() {
      AcceptMR();
    });
    acceptBtn.appendChild(textnode);
    // document.insertBefore(acceptBtn, mergeBtn.childNodes[0]);  // Insert <li> before the first child of <ul>
    mergeSpan.appendChild(acceptBtn);

    
  }
}

function GitlabParseURLInfo(url){
  let projectInfo = {};
  [projectInfo.groupname,projectInfo.projectname,projectInfo.type,projectInfo.mr] =  lodash.split(lodash.split(url,"http://www.lejuhub.com/")[1],'/');
  projectInfo.project = projectInfo.groupname + '/' + projectInfo.projectname;
  return projectInfo;
}

function QueryProjectMrs(page,per_page,project,history,callback){
  gitlab_axios_instance
    .get(
      "/projects/" +
        encodeURIComponent(project) +
        "/merge_requests?state=opened&per_page="+ per_page +'&page=' + page
    )
    .then(data => {
      if(data.data.length >= per_page){
        QueryProjectMrs(page+1,per_page,project,lodash.concat(history,data.data),callback);
      }
      else{
        callback(null,lodash.concat(history,data.data));
      }
    })
    .catch((err)=>{
      callback(err,null);
    });
}

function GitlabMrsCommits(mrs,history,callback){
  if(mrs.length > 0){
    let mr = mrs[0];
    gitlab_axios_instance
      .get('/projects/'+ mr.project_id+'/merge_requests/'+ mr.iid +'/commits?per_page=100&page=1')
      .then((ret)=>{
        history[history.length] = {id:mr.iid,created_at:mr.created_at,commits:lodash.map(ret.data,(data)=>{
          return data.id;
        })};
        GitlabMrsCommits(lodash.slice(mrs,1),history,callback);})
      .catch((error)=>{
        callback(error,null);
      });
  }
  else{
    callback(null,history);
  }
}

function GitlabGetCurUrlAssign(curUrl,mrs){
  return lodash.filter(mrs,(mr)=>{
    if(mr.iid+'' === curUrl.mr){
      return true;
    }
    return false;
  });
}

function AcceptMR(){
  acceptBtn.innerHTML = "Checking";
  acceptBtn.setAttribute("disabled", "disabled");
  let curURL = document.URL;
  let urlInfo = GitlabParseURLInfo(curURL);
  console.log('urlinfo is;',urlInfo);
  QueryProjectMrs(1,100,urlInfo.project,[],(error,data)=>{
    console.log('error:',error,' data is:',data);
    if(!error){
      let assign = GitlabGetCurUrlAssign(urlInfo,data)[0].assignee;
      assign = assign && assign.username;
      console.log('assign is:',assign);
      GitlabMrsCommits(data,[],(error,commits)=>{
        console.log('error is:',error);
        if(!error){
          let curCommits = lodash.filter(commits,(data)=>{
            return data.id == urlInfo.mr;
          })[0];
          let otherCommits = lodash.filter(commits,(data)=>{
            return data.id != urlInfo.mr;
          });
          let crossMRs = lodash.filter(otherCommits,(commits)=>{
            let matched = false;
            lodash.map(curCommits.commits,(commit)=>{
              if(lodash.includes(commits.commits,commit)){
                matched = true;
              }
            });
            return matched;
          });
          let curCreatedAt = new Date(curCommits.created_at);
          let foundOldCrossMr = false;
          lodash.map(crossMRs,(mr)=>{
            let mrCreatedAt = new Date(mr.created_at);
            if(mrCreatedAt < curCreatedAt){
              foundOldCrossMr = true;
            }
          });
          console.log('Found old corss Mr:',foundOldCrossMr);
          if(foundOldCrossMr){
            acceptBtn.innerHTML = "Found crossed MR Can't Merge";
            acceptBtn.setAttribute("disabled", "disabled");
          }
          else if(assign === config.assign){
            if(curCommits.commits.length >= 50){
              acceptBtn.innerHTML = "This MR include over 50 commits,Reject it!";
            }
            else{
              acceptBtn.innerHTML = "Check pass Merging";
              mergeBtn.removeAttribute("disabled", "enabled");
              removeSourceBranch.checked = true;
              setTimeout(()=>{
               mergeBtn.click();
              }, 1600);
            }

          }
          else{
            acceptBtn.innerHTML = "This MR is not assignee to you";
          }
        }
      });
    }
  });
}

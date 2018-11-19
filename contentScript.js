var config = require('./config');
var axios = require('axios');
var lodash = require('lodash');

var gitlab_axios_instance = axios.create({
  baseURL: config.api_url,
  timeout: 10000,
  headers: { "PRIVATE-TOKEN": config.token}
});

window.addEventListener ("load", myMain, false);

var mergeBtn;
var acceptBtn;

function myMain () {
  let removeSourceBranch = document.evaluate (
    '// *[@id="remove-source-branch-input"]',
    document,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null
  );

  mergeBtn = document.evaluate (
    '//*[@id="content-body"]/div/div[2]/div[3]/div[2]/div[1]/div/div[2]/div/span/button[1]',
    document,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null
  );
  let mergeSpan;
  mergeSpan = document.evaluate (
    '//*[@id="content-body"]/div/div[2]/div[3]/div[2]/div[1]/div/div[2]/div/span',
    document,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null
  );

  if (mergeBtn && mergeSpan && removeSourceBranch){
    let mergeBtnInstance = mergeBtn.snapshotItem(0);
    let mergeSpanInstance = mergeSpan.snapshotItem(0);
    let removeSourceBranchInstance = removeSourceBranch.snapshotItem(0);
    if (!mergeBtnInstance || !mergeSpanInstance || !removeSourceBranchInstance){
      return;
    }
    removeSourceBranchInstance.checked = true;

    mergeBtnInstance.innerHTML = "";
    mergeBtnInstance.setAttribute("disabled", "disabled");
    acceptBtn = document.createElement("Button");       // Create a <li> node
    acceptBtn.className = mergeBtnInstance.className;
    var textnode = document.createTextNode("Accept");  // Create a text node
    acceptBtn.addEventListener('click', function() {
      console.log('comment button is click');
      AcceptMR();
    });
    acceptBtn.appendChild(textnode);
    // document.insertBefore(acceptBtn, mergeBtnInstance.childNodes[0]);  // Insert <li> before the first child of <ul>
    mergeSpanInstance.appendChild(acceptBtn);

    
  }
}

function GitlabParseURLInfo(url){
  let projectInfo = {};
  [projectInfo.groupname,projectInfo.projectname,projectInfo.type,projectInfo.mr] =  lodash.split(lodash.split(url,"http://www.lejuhub.com/")[1],'/');
  console.log('projectInfo:',lodash.split(lodash.split(url,"http://www.lejuhub.com/")[1],'/'));
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
      console.log('dump request error is:',err);
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

function AcceptMR(){
  acceptBtn.innerHTML = "Merging";
  acceptBtn.setAttribute("disabled", "disabled");
  let curURL = document.URL;
  let urlInfo = GitlabParseURLInfo(curURL);
  console.log('urlinfo is;',urlInfo);
  QueryProjectMrs(1,100,urlInfo.project,[],(error,data)=>{
    console.log('error:',error,' data is:',data);
    if(!error){
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
            console.log('cur commits is:',curCommits);
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
        }
      });
    }
  });
}

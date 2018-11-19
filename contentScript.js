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
    var newItem = document.createElement("Button");       // Create a <li> node
    newItem.className = mergeBtnInstance.className;
    var textnode = document.createTextNode("Accept");  // Create a text node
    newItem.addEventListener('click', function() {
      console.log('comment button is click');
    });
    newItem.appendChild(textnode);
    // document.insertBefore(newItem, mergeBtnInstance.childNodes[0]);  // Insert <li> before the first child of <ul>
    mergeSpanInstance.appendChild(newItem);

    AcceptMR();
  }
}

function GitlabParseURLInfo(url){
  let projectInfo = {};
  [projectInfo.project,projectInfo.mr] =  lodash.split(lodash.split(url,"http://www.lejuhub.com/")[1],'/merge_requests/');
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
        history[history.length] = lodash.map(ret.data,(data)=>{
          return data.id;
        });
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
  let curURL = document.URL;
  let urlInfo = GitlabParseURLInfo(curURL);
  console.log('urlinfo is;',urlInfo);
  QueryProjectMrs(1,100,urlInfo.project,[],(error,data)=>{
    console.log('error:',error,' data is:',data);
    if(!error){
      //filter cur mr
      let mrs = lodash.filter(data,(data)=>{
        console.log(data.iid," ",urlInfo.mr);
        return (''+data.iid) !== urlInfo.mr;
      });
      console.log('mrs is:',mrs);
      GitlabMrsCommits(mrs,[],(error,commits)=>{
        console.log('error is:',error);
        if(!error){
          console.log('commits is:',commits);
        }
      })
    }
  });
}

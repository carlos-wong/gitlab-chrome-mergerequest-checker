// var config = require('./config');

window.addEventListener ("load", myMain, false);

var mergeBtn;

function myMain () {
  // DO YOUR STUFF HERE.
  // setTimeout(()=>{
  console.log('Page load');

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
    // '//*[@id="notes"]/div/ul/li/div/div[3]/form/div[3]/div/button[1]',
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

    console.log('Dump mergeBtnInstance is:',mergeBtnInstance.className);
    mergeBtnInstance.innerHTML = "";
    mergeBtnInstance.setAttribute("disabled", "disabled");
    // mergeBtnInstance.removeEventListener("click");
    // mergeBtnInstance.onclick = ()=>{console.log("click comment button for onclick");};
    // mergeBtnInstance.addEventListener('click', function() {
    //   console.log('comment button is click');
    // });
    var newItem = document.createElement("Button");       // Create a <li> node
    newItem.className = mergeBtnInstance.className;
    var textnode = document.createTextNode("Accept");  // Create a text node
    newItem.addEventListener('click', function() {
      console.log('comment button is click');
    });
    newItem.appendChild(textnode);
    // document.insertBefore(newItem, mergeBtnInstance.childNodes[0]);  // Insert <li> before the first child of <ul>
    mergeSpanInstance.appendChild(newItem);


    // mergeBtnInstance.href = 'http://www.baidu.com';
    // mergeBtnInstance.onClick = ()=>{console.log('hicarlos you click new repo');};
  }

  // }, 5000);
}
// mergeBtnInstance.herf = "https://www.baidu.com";

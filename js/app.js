api_key = localStorage.steamApiKey ? localStorage.steamApiKey : prompt('Steam API key (see http://steamcommunity.com/dev/apikey)');
localStorage.steamApiKey = api_key;

var getFriends = id => new Promise((res, rej) => {

  var api_pre = 'http://api.steampowered.com/ISteamUser/GetFriendList/v0001/?key=' + api_key + '&relationship=friend&steamid=';
  var xhr = new XMLHttpRequest();

  xhr.open('GET', api_pre + id);
  xhr.onload = function () {
    if (this.status == 200) {
      var friends = JSON.parse(xhr.response).friendslist.friends;
      var ids = friends.map(f => f.steamid);
      getInfoByIds(ids)
        .then(friends => res(friends))
        .catch(e => rej(e));
    } else rej(xhr.statusText);
  };
  xhr.send();

});

var getInfoByIds = ids => new Promise((res, rej) => {
  var prof_url = 'http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=' + api_key + '&steamids=' + ids.join();
  var xhr = new XMLHttpRequest();

  xhr.open('GET', prof_url);
  xhr.onload = function () {
    if (this.status == 200) {
      var infos = JSON.parse(xhr.response).response.players;
      res(infos);
    } else rej(xhr.statusText);
  }

  xhr.send();
});

var container = document.getElementById('display');
var working = document.getElementById('working');
var nodes = new vis.DataSet();
var edges = new vis.DataSet();
var garph = new vis.Network(container, {nodes, edges}, {
  nodes: {
    borderWidth: 1,
    size: 30,
    color: {
      border: '#333'
    },
    shapeProperties: {
      useBorderWithImage: true
    }
  }
});
var visited = [];

var addNode = function(id, name, image, dst) {
  if(!dst.get().filter(n => n.id == id).length)
    console.log({id, label: name, shape: 'image', image});
    try {
    dst.add({id, label: name, shape: 'image', image, chosen: {
      node: (values, uid) => { drawRel(uid); }
    }});
    } catch (e) {}
}

var addEdge = function(n1, n2, dst) {
  if(!dst.get().filter(e => (e.from == n1 && e.to == n2) || (e.from == n2 && e.to == n1)).length)
    dst.add({from: n1, to: n2});
}

async function drawRel(id) {
  if(visited.includes(id)) return;
  working.className = '';
  var friends = await getFriends(id);
  working.className = 'hide';
  visited.push(id);
  var info = (await getInfoByIds([id]))[0];
  addNode(id, info.personaname, info.avatarfull, nodes);
  friends.forEach(f => {
    addNode(f.steamid, f.personaname, f.avatarfull, nodes);
    addEdge(id, f.steamid, edges);
  });
}

drawRel(prompt('ID to get started (SteamID64)'));
document.addEventListener('keydown', e => {
  if(e.key == "Enter") {
    var as = prompt('Add User(s) by SteamID64 to map (separate by ",")');
    as.split(',').forEach(drawRel);
  }
})

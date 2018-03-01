// https://stackoverflow.com/questions/8495687/split-array-into-chunks
// too lazy.
Object.defineProperty(Array.prototype, 'chunk', {
  value: function(chunkSize) {
    var R = [];
    for (var i=0; i<this.length; i+=chunkSize)
      R.push(this.slice(i,i+chunkSize));
    return R;
  }
});

var cached = [];

var getFriends = id => new Promise((res, rej) => {

  if(cached[id]) res(cached[id]);

  var api_pre = 'http://api.nat.moe/steamapi/GetFriendList/?steamid=';
  var xhr = new XMLHttpRequest();

  xhr.open('GET', api_pre + id);
  xhr.onload = function () {
    if (this.status == 200) {
      var friends = JSON.parse(xhr.response).friendslist.friends;
      var ids = friends.map(f => f.steamid);
      getInfoByIds(ids)
        .then(friends => {
          cached[id] = friends;
          res(friends)
        })
        .catch(e => rej(e));
    } else rej(xhr.statusText);
  };
  xhr.send();

});

var getInfoByIds = ids => new Promise((res, rej) => {

  var fetchOnce = ids => new Promise((res, rej) => {
    var prof_url = 'http://api.nat.moe/steamapi/GetPlayerSummaries/?steamids=' + ids;
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

  Promise.all(
    ids.chunk(100)
       .map(arr => arr.join())
       .map(async ids => await fetchOnce(ids))
  ).then(arr => res(arr.reduce((accr, cuur) => accr.concat(cuur))));


});

var container = document.getElementById('display');
var working = document.getElementById('working');
var nodes = new vis.DataSet();
var edges = new vis.DataSet();
var graph = new vis.Network(container, {nodes, edges}, {
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

graph.on('doubleClick', e => {
  if(e.nodes.length) window.open('http://steamcommunity.com/profiles/' + e.nodes[0]);
});

graph.on('select', e => {
  if(e.nodes.length) drawRel(e.nodes[0]);
});

var visited = [];

var addNode = function(id, name, image, dst) {
  if(!dst.get().filter(n => n.id == id).length)
    try {
    dst.add({id, label: name, shape: 'image', image});
    } catch (e) {}
}

var addEdge = function(n1, n2, dst) {
  if(!dst.get().filter(e => (e.from == n1 && e.to == n2) || (e.from == n2 && e.to == n1)).length)
    dst.add({from: n1, to: n2});
}

async function drawRel(id) {
  if(visited.includes(id)) return;
  working.className = '';
  try {
    var info = (await getInfoByIds([id]))[0];
    if (info.communityvisibilitystate != 3) {
      alert(`Error procressing id ${id}: Profile is not public.`);
      working.className = 'hide';
      return;
    }
    var friends = await getFriends(id);
  } catch (e) {
    alert(`Error procressing id ${id}: ${e}. Is the ID correct? (use SteamID64, not profile name or custom URL)`);
    working.className = 'hide';
    return;
  }
  addNode(id, info.personaname, info.avatarfull, nodes);
  friends.forEach(f => {
    if (f.communityvisibilitystate != 3) visited.push(f.steamid);
    addNode(f.steamid, f.personaname, f.avatarfull, nodes);
    addEdge(id, f.steamid, edges);
  });
  working.className = 'hide';
  visited.push(id);
}

drawRel(prompt('ID to get started (SteamID64)'));
document.addEventListener('keydown', e => {
  if(e.key == "Enter") {
    var as = prompt('Add User(s) by SteamID64 to map (separate by ",")');
    as.split(',').forEach(drawRel);
  }
})

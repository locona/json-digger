export default class JSONDigger {
  constructor(datasource, idProp, childrenProp) {
    this.ds = datasource;
    this.id = idProp;
    this.children = childrenProp;
    this.count = 0;
  }

  countNodes (obj) {
    var _this = this;
    this.count++;
    if (!obj || !Object.keys(obj).length) {
      return false;
    } else {
      if (obj[this.children]) {
        obj[this.children].forEach(child => {
          _this.countNodes(child);
        });
      }
    }
  }

  // findNodeById (obj, id) {
  //   const _this = this;
  //   this.countNodes(obj);
  //   return new Promise((resolve, reject) => {
  //     if (!obj || !Object.keys(obj).length || !id) {
  //       reject(new Error('One or more input parameters are invalid'));
  //     }
  //     function findNodeById (obj, id, callback) {
  //       if (obj[_this.id] === id) {
  //         _this.count = 0;
  //         callback(null, obj);
  //       } else {
  //         if (_this.count === 1) {
  //           _this.count = 0;
  //           callback('the node doesn\'t exist', null);
  //         }
  //         _this.count--;
  //         if (obj[_this.children]) {
  //           obj[_this.children].forEach(node => {
  //             findNodeById(node, id, callback);
  //           });
  //         }
  //       }
  //     }
  //     findNodeById(obj, id, (msg, node) => {
  //       if (msg) {
  //         reject(new Error(msg));
  //       } else {
  //         resolve(node);
  //       }
  //     });
  //   });
  // }

  findNodeById (id) {
    const _this = this;
    this.countNodes(this.ds);
    return new Promise((resolve, reject) => {
      if (!id) {
        return reject(new Error('Parameter id is invalid.'));
      }
      function findNodeById (obj, id, callback) {
        if (obj[_this.id] === id) {
          _this.count = 0;
          callback(null, obj);
        } else {
          if (_this.count === 1) {
            _this.count = 0;
            callback('The node doesn\'t exist.', null);
          }
          _this.count--;
          if (obj[_this.children]) {
            obj[_this.children].forEach(node => {
              findNodeById(node, id, callback);
            });
          }
        }
      }
      findNodeById(this.ds, id, (msg, node) => {
        if (msg) {
          reject(new Error(msg));
        } else {
          resolve(node);
        }
      });
    });
  }

  matchConditions (obj, conditions) {
    var flag = true;
    Object.keys(conditions).some(item => {
      if (typeof conditions[item] === 'string' || typeof conditions[item] === 'number' || typeof conditions[item] === 'boolean') {
        if (obj[item] !== conditions[item]) {
          flag = false;
          return true;
        }
      } else if (conditions[item] instanceof RegExp) {
        if (!conditions[item].test(obj[item])) {
          flag = false;
          return true;
        }
      } else if (typeof conditions[item] === 'object') {
        Object.keys(conditions[item]).some(subitem => {
          switch (subitem) {
            case '>': {
              if (!(obj[item] > conditions[item][subitem])) {
                flag = false;
                return true;
              }
              break;
            }
            case '<': {
              if (!(obj[item] < conditions[item][subitem])) {
                flag = false;
                return true;
              }
              break;
            }
            case '>=': {
              if (!(obj[item] >= conditions[item][subitem])) {
                flag = false;
                return true;
              }
              break;
            }
            case '<=': {
              if (!(obj[item] <= conditions[item][subitem])) {
                flag = false;
                return true;
              }
              break;
            }
            case '!==': {
              if (!(obj[item] !== conditions[item][subitem])) {
                flag = false;
                return true;
              }
              break;
            }
          }
        });
        if (!flag) {
          return false;
        }
      }
    });

    return flag;
  }

  findNodes (conditions) {
    const _this = this;
    this.countNodes(this.ds);
    return new Promise(async(resolve, reject) => {
      if (!conditions || !Object.keys(conditions).length) {
        return reject(new Error('Parameter conditions are invalid.'));
      }
      let nodes = [];
      function findNodes(obj, conditions, callback) {
        if (_this.matchConditions(obj, conditions)) {
          nodes.push(obj);
          if (_this.count === 1) {
            _this.count = 0;
            callback(!nodes.length ? 'The nodes don\'t exist.' : null, nodes.slice(0));
          }
        } else {
          if (_this.count === 1) {
            _this.count = 0;
            callback(!nodes.length ? 'The nodes don\'t exist.' : null, nodes.slice(0));
          }
        }
        _this.count--;
        if (obj[_this.children]) {
          obj[_this.children].forEach(child => {
            findNodes(child, conditions, callback);
          });
        }
      }
      findNodes(this.ds, conditions, (msg, nodes) => {
        if (msg) {
          reject(new Error(msg));
        } else {
          resolve(nodes);
        }
      });
    });
  }

  findParent (id) {
    const _this = this;
    this.countNodes(this.ds);
    return new Promise((resolve, reject) => {
      if (!id) {
        return reject(new Error('Parameter id is invalid.'));
      }
      function findParent (obj, id, callback)  {
        if (_this.count === 1) {
          _this.count = 0;
          callback('The parent node doesn\'t exist.', null);
        } else {
          _this.count--;
          if (typeof obj[_this.children] !== 'undefined') {
            obj[_this.children].forEach(function(child) {
              if (child[_this.id] === id) {
                _this.count = 0;
                callback(null, obj);
              }
            });
            obj[_this.children].forEach(function(child) {
              findParent(child, id, callback);
            });
          }
        }
      }
      findParent(this.ds, id, (msg, parent) => {
        if (msg) {
          reject(new Error(msg));
        } else {
          resolve(parent);
        }
      });
    });
  }

  async findSiblings (id) {
    const _this = this;
    if (!id) {
      throw new Error('Parameter id is invalid.');
    }
    try {
      const parent = await this.findParent(id);
      return parent[this.children].filter(child => {
        return child[_this.id] !== id;
      });
    } catch (err) {
      throw new Error('The sibling nodes don\'t exist.');
    }
  }

  findAncestors (id) {
    const _this = this;
    return new Promise(async(resolve, reject) => {
      if (!id) {
        return reject(new Error('Parameter id is invalid.'));
      }
      let  nodes = [];
      async function findAncestors (id) {
        try {
          if (id === _this.ds[_this.id]) {
            if (!nodes.length) {
              throw new Error('The ancestor nodes don\'t exist.');
            }
            return nodes.slice(0);
          } else {
            const parent = await _this.findParent(id);
            nodes.push(parent);
            return findAncestors(parent[_this.id]);
          }
        } catch (err) {
          throw new Error('The ancestor nodes don\'t exist.');
        }
      }
      try {
        const ancestors = await findAncestors(id);
        resolve(ancestors);
      } catch (err) {
        reject(err);
      }
    });
  }

  async addChildren (id, data) {
    try {
      const parent = await this.findNodeById(id);
      parent[this.children].push(data);
    } catch (err) {
      throw new Error('Failed to add child nodes.');
    }
  }

  addSiblings (id, data) {

  }

  addParent (id, data) {

  }

  removeNodes (ids) {

  }

  editNode (id, data) {

  }

};
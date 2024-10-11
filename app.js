const express = require("express");
const session = require('express-session');
const app = express();
const sqlite = require('sqlite3');
const qs = require('querystring');

app.use(
	session({
		secret: 'secret',
		resave: false,
		saveUninitialized: false
	})
);

// Start of Program
console.log("Volapp");

// DATABASE CONNECTION AND CREATION
const db = new sqlite.Database('/Users/advaitbhowmik/documents/volapp/database.db', err => err ? console.log(err): console.log('connected to database'));

// Table for all companies
db.run(
    'CREATE TABLE IF NOT EXISTS oppurtunities (id integer primary key autoincrement, title text, password text, passcode text, description text, minAge int, phoneNum text, website text, email text, field text)',
    err => {
        err ? console.log(err) : console.log('created opputunities table');
    }
);

// Table for volunteer log
db.run('Create table if not exists log (id integer primary key autoincrement, name text, time int, date text, organization text, username text);', (err) => {
    err?console.log(err):console.log('created activity log');
});

// Table for all individual users
db.run(
    'CREATE TABLE IF NOT EXISTS users (id integer primary key  autoincrement, username text, password text, email text)',
    err => {
        err ? console.log(err) : console.log('created users table');
    }
);

// table for joining organizations

db.run('Create table if not exists school_students_list (id integer primary key autoincrement, name text, organization text)', err => {
  err?console.log(err):console.log('students table created');
});


// Table for company events/tasks

db.run('create table if not exists org_tasks (id integer primary key autoincrement, name text, organization text, time int, date text)', err => {
  err?console.log(err):console.log('created tasks table')
});

// table for task signup

db.run('create table if not exists task_signup (id integer primary key autoincrement, taskid int, name text, organization text)', err => {
  err?console.log(err):console.log('created task sign-up table');
});


// SERVER HANDLING
sendView = function (view, res) {
    res.sendFile('/views/' + view + '.html', { root: __dirname });

};

app.get('/', (req, res) => {
    //res.send('Hello');
    sendView('home', res);
});

app.get('/user', (req,res) => {
    res.send(req.session.name);
});

app.get('/login', (req, res) => {
    if (req.session.type === 'individual') {
        res.redirect('/dashboard')
    } else {
        sendView('login', res);
    }
    
});

app.get('/newentry', (req, res) => {
    sendView('newentry', res);
});

app.get('/activitylog', (req, res) => {
    if (req.session.type === 'individual') {
      sendView('activitylog', res);
    } else (res.redirect('/login')); 
});

app.get('/register', (req, res) => {
    if (req.session.type === 'individual') {
        res.redirect('/dashboard')
    } else {
        sendView('register', res);
    }
});

app.get('/dashboard', (req, res) => {
    if (req.session.type === 'individual') {
        sendView('dashboard', res);
    } else {
        res.redirect('/login');
    }

});



app.post('/entrypost', (req, res) => {
    // Gather all the data
	let rawData;
	req.on('data', chunk => {
		rawData += chunk;
	});
    // Convert data to JSON and prepare for database entry
	req.on('end', () => {
		const formData = qs.parse(rawData);
        console.log(formData);

        const entryInfoArray = [
            formData.title,
            formData.password,
            formData.passcode,
            formData.description,
            formData.minAge,
            formData.pNum,
            formData.undefinedWebsite,
            formData.email,
            formData.field
        ];

        db.run(
			'insert into oppurtunities (title, password, passcode, description, minAge, phoneNum, website, email, field) values(?, ?, ?, ?, ?, ?, ?, ?, ?)',
			entryInfoArray,
			err => {
				err ? console.log(err) : console.log('succesfully entered');
				db.each('select * from oppurtunities', (err, row) => {
					err ? console.log(err) : console.log(row);
				});
			}
		);

    req.session.type = 'company';
    req.session.name = formData.title;
    req.session.isAuth = true;
    res.redirect('/company/dashboard');

	});
});


app.post('/company/addtask', (req, res) => {
  if (req.session.type === 'company') {
    let rawData;
    req.on('data', (chunk) => {
      rawData += chunk;
    }).on('end', () => {
      const formData = qs.parse(rawData);
      console.log(formData);
      db.run('insert into org_tasks (name, organization, time, date) Values (?, ?, ?, ?)', formData.undefinedname, req.session.name, formData.time, formData.date, err => {
        if (err) {console.log(err)} else {
          db.all('select * from org_tasks', (err, rows) => {
            console.log(rows)
          });
        }
      });
    });
  } 
  res.redirect('/company/dashboard');
});




app.get('/schools/tasks', (req, res) => {
  //console.log('req received');
  
  if (req.query.school) {
    console.log('id present')
    db.all('select * from org_tasks where organization = ?', req.query.school, (err, rows) => {
      res.send(rows)
    })
  } 
  else if (req.query.taskid) {
    console.log('hello')
    db.get('select * from org_tasks where id = ?', (req.query.taskid.substring(4)), (err, row) => {
      res.send(row);
    });
  }
  
  else if (req.session.type === 'company') {
    db.all('select * from org_tasks where organization = ?', req.session.name, (err, rows) => {
      res.send(rows)
    });
  }
});       




app.get('/company/dashboard', (req, res) => {
  console.log("Reached company page")
  if (req.session.isAuth && req.session.type == 'company') {
    sendView("company", res);
  }
});

app.get('/discover', (req, res, next) => {
      if (req.session.isAuth) {
        sendView("discover", res);
      } else {
        res.redirect('/login');
      }     
});


app.get('/trials2', (req, res) => {
    console.log('request received');
    console.log(req.query);
    if (req.query.field === 'All') {
      db.all('select * from oppurtunities', (err, rows) => {
        res.send(rows);
      });
  
    } else {
      db.all('select * from oppurtunities where field = ?', [req.query.field], (err, rows) => {
        console.log(rows);
        res.send(rows);
      });
    }
});


app.post('/logentry', (req, res) => {
    let rawData;
  
    req.on('data', chunk => {
      rawData += chunk;
       
    });
  
    req.on('end', () => {
      const formData = qs.parse(rawData);
      console.log(formData);
  
      const entryData = [formData.undefinedname, formData.time, formData.date, req.session.name];
       
  
      db.run('insert into log (name, time, date, username) values (?, ?, ?, ?)', entryData, err => {
        err?console.log(err):console.log('entered into log');
        db.each('select * from log', (err, row) => {
          err?console.log(err):console.log(row);
  
        });
      });
      
      res.redirect('/activitylog')
    });
  
});


app.get('/logData', (req, res) => {
    db.all('select * from log where username = ?', req.session.name, (err, rows) => {
      err?console.log(err):res.json(rows);
    });
});

app.post('/login', (req, res) => {

	let rawData;
  req.on('data', (chunk) => {
    rawData += chunk;
  });
  req.on('end', () => {
    const formData = qs.parse(rawData);
    loginInput = [formData.undefinedusername, formData.password];
    
    db.each('select count(*) from users where username = ? AND password = ?', loginInput, (err, row) => {
      err?console.log(err):console.log(row);

      if (row['count(*)'] >= 1) {
        console.log('verified');
        req.session.isAuth = true;
        req.session.type = 'individual';
        req.session.name = loginInput[0];
        console.log(req.session.name);
        res.redirect('/dashboard');
      } else {

        console.log('reached the else');

        db.each('select count(*) from oppurtunities where title = ? AND password = ?', loginInput, (err, row) => {

      if (row['count(*)'] >= 1) {
        console.log('verified');
        req.session.isAuth = true;
        req.session.type = 'company';
        req.session.name = loginInput[0];
        res.redirect('/company/dashboard');
      } else {res.redirect('/login')}

    });  
      }
    });
  });
});



app.post('/register', (req, res) => {
	let rawData;
	req.on('data', chunk => {
		rawData += chunk;
	});
	req.on('end', () => {
		const formData = qs.parse(rawData);
		console.log(formData);

    if (formData.undefinedusername.length > 5 && formData.password.length > 5) {

    db.get('select count(*) from users where username = ?', formData.undefinedusername, (err, count) => {
      if (count['count(*)'] >= 1) {
        console.log('new account credentials already in use');
        res.redirect('/register');
      } else {

        

        db.get('select count(*) from oppurtunities where title = ?', formData.undefinedusername, (err, count) => {
          if (count['count(*)'] >= 1) {
            res.redirect('/register')
          } else {
            
            const newUser = [formData.undefinedusername, formData.password, formData.email];
            console.log(newUser);

        db.run(`insert into users (username, password , email) values (?, ?, ?)`, newUser, (err) => {
          if (err) {console.log(err)} else {
            req.session.isAuth = true;
            req.session.name = newUser[0];
            req.session.type = 'individual'
            res.redirect('/dashboard');
          }
        });

          }
        })
 
      }
    });

    } else { res.redirect('/register') } 
			
	});
});





app.get('/schools', (req, res) => {
  if (req.session.isAuth && req.session.type == 'individual') {
    sendView('groups', res);
  } else {
    res.redirect('/login');
  }  
});


app.post('/schools/join', (req, res) => {
  let rawData;
  req.on('data', chunk => {
    rawData += chunk;
  });
  req.on('end', () => {
    const formData = qs.parse(rawData);

    db.get('select title, passcode from oppurtunities where title = ? AND passcode = ?', formData.undefinedname, formData.passcode, (err, row) => {
    
    if (row) {
      console.log('select query:');
      console.log(row);
      
      db.get('select count(*) from school_students_list where name = ? AND organization = ?', req.session.name, formData.undefinedname, (err, row) => {

        if (row) {

        // checks if already in organization, otherwise adds them
        if (row['count(*)'] >= 1) {res.redirect('/schools')} else {
          db.run('insert into school_students_list (name, organization) VALUES (?, ?)', req.session.name, formData.undefinedname, err => {
            if (err) {console.log(err)}
            res.redirect('/schools');
          });
        }
        } else {res.redirect('/schools')}

      })
      
    } else {
      res.redirect('/schools');
    }
      

    });
  });
});

app.get('/schools/join', (req, res) => {
  console.log('school join request');
  const schoolid = req.query.schoolid.substring(3);

  db.get('select * from oppurtunities where id = ?', schoolid, (err, opp) => {
    console.log(opp);
      db.get('select count(*) from school_students_list where name = ? AND organization = ?', req.session.name, opp.title, (err, row) => {
        if (row) {
        if (row['count(*)'] >= 1) {res.redirect('/schools')} else {
          console.log('Lionel Messi is the goat');
          db.run('insert into school_students_list (name, organization) VALUES (?, ?)', req.session.name, opp.title, err => {
            if (err) {console.log(err)}
            res.redirect('/schools');
          });
        }
        } else {res.redirect('/schools')}
      })
  })
});


app.get('/schools/myschools', (req, res) => {
  console.log('request received');
  db.all('select organization from school_students_list where name = ?', req.session.name, (err, rows) => {
  res.send(rows);
  });

});

app.get('/schools/:name', (req, res) => {

  db.get('select count(*) from school_students_list where name = ? AND organization = ?', req.session.name, req.params.name, (err, row) => {
    if (row['count(*)'] >= 1) {
      sendView('group', res);
    } else {
      res.redirect('/schools');
    }
  });
});


app.get('/schoolsInfo/:name', (req, res) => {
  console.log('request received');

  //CHECK TO SEE IF USER IS IN SCHOOL
  db.get('select count(*) from school_students_list where name = ? AND organization = ?', req.session.name, req.params.name, (err, row) => {

    if (row['count(*)'] >= 1) {
      
      db.all('select * from school_students_list where organization = ?', req.params.name, (err, rows) => {
        res.send(rows);
      });
    } 
  }); 
});







app.get('/tasks/signup', (req, res) => {
  console.log('TASK SIGNUP REQUEST');
  console.log(req.query.taskid);

  let taskOrg;

  db.get('select organization from org_tasks where id = ?', req.query.taskid.substring(4), (err, row) => {
    err?console.log(err):taskOrg = row.organization;
  });

  db.get('select count(*) from task_signup where name = ? AND taskid = ?', req.session.name, req.query.taskid, (err, count) => {
    if (err) {console.log(err)} else {
      if (count['count(*)'] > 0) {
        console.log('already signed up');
      } else {

  db.run('insert into task_signup (taskid, name, organization) VALUES (?, ?, ?)', req.query.taskid, req.session.name, taskOrg, err => {
    if (err) {console.log(err)} else {
      db.all('select * from task_signup', (err, rows) => {
        err?console.log(err):console.log(rows);
      })
    }
  })

      }
    }
  }); 

});   

app.get('/tasks/signedup', (req, res) => {

  if (req.session.type === 'individual') {
    db.all('select * from task_signup where name = ?', req.session.name, (err, rows) => {
      res.send(rows);
    });
  } else if (req.session.type === 'company') {
    db.all('select * from task_signup where organization = ?', req.session.name, (err, rows) => {
      console.log(rows);
    })
  }
  
});

app.get('/tasks/searchsignup', (req, res) => {
  if (req.session.type === 'individual') {
    const searchtaskid = "task" + req.query.taskid;

    db.get('select * from task_signup where name = ? AND taskid = ?', req.session.name, searchtaskid, (err, rows) => {
      console.log("searched database");
      if (rows) {
        res.send("True");
      } else {
        res.send("False");
      }
    });
  }
});



app.get('/tasks/update', (req, res) => {
  console.log('request recieved to update task list');
  console.log(req.query.taskid.substring(5));

  db.all('select * from task_signup', (err, rows) => {
    console.log(rows);
  })
  
  //update activity log:

  db.get('select * from task_signup where id = ?', req.query.taskid.substring(5), (err, row) => {
     const id = row.taskid.substring(4);
     console.log('results:')
     console.log(row)
     db.get('select * from org_tasks where id = ?', id, (err, row) => {
       if (err) {console.log(err)} else {
         console.log(row);

         db.run('insert into log (name, time, date, organization, username) VALUES (?, ?, ?, ?, ?)', row.name, row.time, row.date, row.organization, req.session.name, err => {
           console.log(err)
             //delete this entry from task sign up:
             db.run('delete from task_signup where id = ?',   
               req.query.taskid.substring(5), err => {
              err?console.log(err):console.log('deleted task for user');
              });
         });

       }
     })
  })


  
})



// Logout
app.get('/logout', (req, res) => {
	req.session.destroy();
	res.redirect('/');
});


// Handle Page Not Found:
app.get('/:noSuchPage', (req, res) => {
    res.send(`<h1>Error: Page Not Found</h1>
    <a href = /discover>Discover</a>`)
});


// RUN THE SERVER
const port = 3000;
app.listen(port, () => {
    console.log('http://localhost:3000');
});

var SDC = require('statsd-client');
metrics = new SDC({port: 8125});

//Counter for User API 
metrics.increment("User.POST.sign_Up");


// ================ timer =================

metrics.timing("User.POST.dbsign_Up");




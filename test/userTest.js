let chai = require('chai');
let chaiHttp = require('chai-http');
let server = require('../server');
let should = chai.should();


chai.use(chaiHttp);


describe('/GET api', () => {
  it('check API is working or not', (done) => {
    chai.request(server)
        .get('/v1/')
        .end((err, res) => {
              res.should.have.status(200);
             done();
        });
  });
});


describe('/Update users', () => {
  it('check authorization headers', (done) => {
    chai.request(server)
            .put('/v1/users/self')
            .send()
            .end((err, res) => {
                  res.should.have.status(404);
                  // res.body.should.be.a('object');
                  // res.body.should.have.property('errors');
                  // res.body.errors.should.have.property('pages');
                  // res.body.errors.pages.should.have.property('kind').eql('required');
              done();
            });
  });
});

describe('/create users', () => {
  it('check for null values', (done) => {
    chai.request(server)
            .post('/v1/users/self')
            .send()
            .end((err, res) => {
                  res.should.have.status(404);
                  // res.body.should.be.a('object');
                  // res.body.should.have.property('errors');
                  // res.body.errors.should.have.property('pages');
                  // res.body.errors.pages.should.have.property('kind').eql('required');
              done();
            });
  });
});

describe('/get users', () => {
  it('check for null values', (done) => {
    chai.request(server)
            .post('/v1/users/self')
            .send()
            .end((err, res) => {
                  res.should.have.status(404);
                  
              done();
            });
  });
});
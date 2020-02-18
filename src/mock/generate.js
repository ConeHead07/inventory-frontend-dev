// employees.js
var faker = require('faker');

function generate () {
  var data = [];


  var kunden = [
    { 'mid': 1,  'uid': 1400, 'name': 'Vodafone', 'invMandator': 1 },
    { 'mid': 3,  'uid': 1100, 'name': 'Rheinenergie', 'invMandator': 3 },
    { 'mid': 4,  'uid': 1300, 'name': 'Manpower', 'invMandator': 4 },
    { 'mid': 5,  'uid': 1200, 'name': 'APO Bank', 'invMandator': 5 },
    { 'mid': 6,  'uid': 1500, 'name': 'Rheinmetall', 'invMandator': 6 },
    { 'mid': 10, 'uid': 1600, 'name': 'APO-Data', 'invMandator': 10 },
    { 'mid': 11, 'uid': 1000, 'name': 'RTL Köln', 'invMandator': 11 },
    { 'mid': 12, 'uid': 1700, 'name': 'Mertens', 'invMandator': 12 },
  ];


  var gebaeude = {
    '1': [ 'Riehler Str. 34']
  };
  var raeume = [];

  for (var id = 0; id < 50; id++) {
    var firstName = faker.name.firstName()
    var lastName = faker.name.lastName()
    var email = faker.internet.email()
    employees.push({
      "id": id,
      "first_name": firstName,
      "last_name": lastName,
      "email": email
    })
  }
  return { "employees": employees }
}
module.exports = generate

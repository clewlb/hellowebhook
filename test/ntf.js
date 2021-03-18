var expect = require("chai").expect;
var ntf = require("../models/ntf");

describe("Notification Service", function() {

    // describe("Subscribe", function() {
    //     it("Subscribe", async function() {
    //         const data = await ntf.subscribe({
    //             "mid": "clement_inc",
    //             "api_token": "60AF375C-FA01-4E64-A2E5-CE00AED3B44B",
    //             "api_secret": "9EB28EBDB8CD04BC3AE63CF2DCB35CEB201BAC145E170FDCF987321352E4B2CB",
    //             "notification_url": "https://clementwong.requestcatcher.com/notification"
    //         });

    //         expect(data).to.deep.equal({
    //             ok: 200
    //         });
    //     });
    // });

    // describe("Inititate", function() {
    //     it("Inititate", async function() {
    //         const data = await ntf.init({
    //             "mid": "clement_inc",
    //             "payload": {
    //                 "name": "John",
    //                 "age": 30,
    //                 "city": "New York"
    //             }
    //         });
    //         expect(data).to.deep.equal({
    //             ok: 200
    //         });
    //     });
    // });

    describe("Send Notification", function() {
        it("Send Notification", async function() {
            const data = await ntf.resendNotification({
                "_id": "msg_clement_inc_1616052893964_DB8AE658-15EC-44AC-AEC6-5F27DD633A54",
                "_rev": "1-029cdbf5e55e64ea20cb0b4989af22d1",
                "docType": "msg",
                "payload": {
                    "name": "John",
                    "age": 30,
                    "city": "New York"
                },
                "results": [],
                "status": "pending",
                "lastUpdated": 1616052893964
            });
            expect(data).to.deep.equal({
                ok: 200
            });
        });
    });

});
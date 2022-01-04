import fetch from "node-fetch";

// by using "https://mocki.io/fake-json-api" to create a mock api
const INPUT_DATA_API = 'https://mocki.io/v1/b84eb3c1-0b19-4a5c-a0d0-8788662d180d';
const OUTPUT_DATA_API = 'address'; // will create later

const MAX_TIME_DIFF_SECOND = 10;
// convert min to milliseconds
const MAX_TIME_DIFF_MILLISECOND = MAX_TIME_DIFF_SECOND * 60000;

// re-arrange users' events
function userEvents(input) {
    // create Map to store events for each user
    // key: visitorID
    // value: users' events object (url & timestamp)
    let userEventMap = new Map();

    for(let event in input) {
        let eventInformation = {
            timestamp: input[event].timestamp,
            url: input[event].url
        };

        if(userEventMap.has(input[event].visitorId)) {
            userEventMap.get(input[event].visitorId).push(eventInformation);

            // chronological sort event timestamp
            userEventMap.get(input[event].visitorId).sort((a, b) => a.timestamp - b.timestamp);
        } else {
            userEventMap.set(input[event].visitorId, []);
            userEventMap.get(input[event].visitorId).push(eventInformation);
        }
    }

    return userEventMap;
}

// transform users' events to sessions
function userSessions(input) {
    let userEvent = userEvents(input);

    // create Map to store session for each user
    // key: visitorID
    // value: users' session object (duration & pages & startTime)
    let userSessionMap = new Map();

    // go through userEventMap, store visitorId to userSeesionMap
    for(let visitorId of userEvent.keys()) {
        // go through each users' events object (url & timestamp)
        // store users' session object (duration & pages & startTime) in userSeesionMap
        for(let event = 0; event < userEvent.get(visitorId).length; event ++) {
            if(userSessionMap.has(visitorId)) {
                let current_session_length = userSessionMap.get(visitorId).length;
                let duration_time = userEvent.get(visitorId)[event].timestamp - userSessionMap.get(visitorId)[current_session_length - 1].startTime;
                let timestamp_diff = userEvent.get(visitorId)[event].timestamp - userEvent.get(visitorId)[event - 1].timestamp;

                if(timestamp_diff <= MAX_TIME_DIFF_MILLISECOND) {
                    userSessionMap.get(visitorId)[current_session_length - 1].duration = duration_time;
                    userSessionMap.get(visitorId)[current_session_length - 1].pages.push(userEvent.get(visitorId)[event].url);

                    // chronological sort session pages
                    // userSessionMap.get(visitorId)[current_session_length - 1].pages.sort((a, b) => a - b);
                } else {
                    let newSessionInformation = {
                        duration: 0,
                        pages: [],
                        startTime: userEvent.get(visitorId)[event].timestamp
                    };
                    newSessionInformation.pages.push(userEvent.get(visitorId)[event].url);
                    userSessionMap.get(visitorId).push(newSessionInformation);
                }
            } else {
                // create new record in the userSessionMap with key "visitorId"
                userSessionMap.set(visitorId, []);

                let sessionInformation = {
                  duration: 0,
                  pages: [],
                  startTime: userEvent.get(visitorId)[event].timestamp
                };
                sessionInformation.pages.push(userEvent.get(visitorId)[event].url);

                userSessionMap.get(visitorId).push(sessionInformation);
            }
        }
    }
    // console.log(userSessionMap);

    // convert Map to json
    let userSessionJsonObject = Object.fromEntries(userSessionMap);
    // console.log(JSON.stringify(userSessionJsonObject));

    return userSessionJsonObject;
}

(async() => {
    try{
        // (GET) get raw event data from API
        const RAW_DATA = await fetch(INPUT_DATA_API)
        const INPUT = await RAW_DATA.json()
        // console.log(INPUT.events)

        // transform event to session
        let output = {
            sessionsByUser: userSessions(INPUT.events)
        }
        // console.log(JSON.stringify(output))

        // (POST) post session result to another API
        const config = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(output)
        }
        const response = await fetch(OUTPUT_DATA_API, config)

        const test_response = await response.json();
        console.dir(test_response);
    } catch (e) {
        console.log(e)
    }
})();
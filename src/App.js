import './App.css';
import * as React from "react";
import Cookies from 'universal-cookie';
import {
    BrowserRouter as Router,
    Switch,
    Route
} from "react-router-dom";

function Card(props) {
    return (
        <div className={`card ${props.selected ? "selected" : ""}`}
                onClick={props.onClick} >
            <span className="cardText">
                {props.value}
            </span>
        </div>
    );
}

function PlayerContainer(props) {
    return (
        <div className={`playerContainer ${props.playerSelectedCard ? "playerSelectedCard" : "playerNotSelectedCard"}`} >
            <Card />
            {props.username}
        </div>
    );
}

class App extends React.Component {
    isARoomUrl = getRoomIdFromUrl().length > 0;

    constructor(props) {
        super(props);
        this.state = {
            roomValidated: false,
            roomIsValid: false
        }
    }

    validateRoom() {
        let data = {
            roomId: getRoomIdFromUrl()
        };
        fetch("http://localhost:1111/validateRoom", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        }).then(response => {
            response.json().then(result => {
                this.setState({
                    roomValidated: true,
                    roomIsValid: result.roomIsValid
                });
            });
        }).catch(error => {
            alert("Error while validating room!");
        });
    }
    
    componentDidMount() {
        if (this.isARoomUrl) {
            this.validateRoom();
        }
    }

    render() {
        if (this.isARoomUrl && !this.state.roomValidated) {
            return (<div>Room is being validated...</div>);
        } else if (this.isARoomUrl && this.state.roomValidated && !this.state.roomIsValid) {
            return (<div>ERROR: Room is not valid!</div>);
        }

        return (
            <Router>
                <Switch>
                    <Route exact path="/" component={Home} />
                    <Route component={Game} />
                </Switch>
            </Router>
        );
    }
}

class Game extends React.Component {
    sock = null;
    socketOpen = false;
    selectedCard = null;

    constructor(props) {
        console.log("Game constructor()");
        super(props);
        this.state = {
            selectedCard: null,
            users: [],
            username: null
        };
    }

    userCookieExists() {
        const cookies = new Cookies();
        return typeof cookies.get("user_id") !== 'undefined';
    }

    getUserIdFromCookie() {
        const cookies = new Cookies();
        return cookies.get("user_id");
    }

    validateUser() {
        return new Promise((resolve, reject) => {
            let data = {
                roomId: this.getUserIdFromCookie()
            };
            fetch("http://localhost:1111/validateUser", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            }).then(response => {
                response.json().then(result => {
                    console.log(result);
                });
            });
        });
    }

    createUser() {
        let name = prompt("Enter your name");
        let data = {
            username: name,
            roomId: getRoomIdFromUrl()
        };

        fetch("http://localhost:1111/createUser", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        }).then((response) => {
            response.json().then(resultObj => {
                console.log(resultObj);
                if (resultObj["userCreated"] === true) {
                    /*cookies.set("user_id", resultObj["userId"]);
                    cookies.set("username", resultObj["username"]);
                    this.userId = resultObj["userId"];
                    this.setState({
                        username: resultObj["username"]
                    });
                    this.sendUserRoomInfo(true);*/
                }
            });
        });
    }

    componentDidMount() {
        console.log("Game componentDidMount()");

        setTimeout(() => {
            if (this.userCookieExists()) {
                this.validateUser();
            } else {
                this.createUser();
            }
        }, 100);
    }

    sendUserRoomInfo(loop) {
        this.sendSocketMessage({cmd: 'autr', uid: this.userId, rid: this.roomId, un: this.state.username, sc: this.selectedCard});
        console.log('send');
        if (loop) {
            setTimeout(() => {
                this.sendUserRoomInfo(true);
            }, 5000);
        }
    }

    sendSocketMessage(msg) {
        if (this.socketOpen) {
            this.sock.send(JSON.stringify(msg));
            console.log('mesaj gitti');
        } else {
            console.log('mesaj gitmedi!');
            setTimeout(() => {
                this.sendSocketMessage(msg)
            }, 1000);
        }
    }


    render() {
        let bottomUsers = [];
        let topUsers = [];
        let leftUsers = [];
        let rightUsers = [];
        let order = 2
        this.state.users.forEach((user) => {
            if (user['userId'] === this.userId) {
                return;
            }
            if (order === 1) {
                bottomUsers.push(user);
                order = 2;
            } else if (order === 2) {
                topUsers.push(user);
                if (leftUsers.length >= 2) {
                    order = 1;
                } else {
                    order = 3;
                }
            } else if (order === 3) {
                rightUsers.push(user);
                order = 4;
            } else if (order === 4) {
                leftUsers.push(user);
                order = 1;
            }
        });
        console.log("Game render()");
        return(
            <div className="App">
                <div className="GameArea">
                    <div className="Players">
                        <div className="table">
                            <div className="playAreaLeft">
                                {
                                    leftUsers.map((value) => {
                                        return <PlayerContainer key={value['userId']} playerSelectedCard={value['playerSelectedCard']} username={value['username']} />;
                                    })
                                }
                            </div>
                            <div className="playAreaTop">
                                {
                                    topUsers.map((value) => {
                                        return <PlayerContainer key={value['userId']} playerSelectedCard={value['playerSelectedCard']} username={value['username']} />;
                                    })
                                }
                            </div>
                            <div className="playAreaRight">
                                {
                                    rightUsers.map((value) => {
                                        return <PlayerContainer key={value['userId']} playerSelectedCard={value['playerSelectedCard']} username={value['username']} />;
                                    })
                                }
                            </div>
                            <div className="playAreaTable">Son Akşam Yemeği</div>
                            <div className="playAreaBottom">
                                <PlayerContainer username={this.state.username} playerSelectedCard={this.state.selectedCard != null} />
                                {
                                    bottomUsers.map((value) => {
                                        return <PlayerContainer key={value['userId']} playerSelectedCard={value['playerSelectedCard']} username={value['username']} />;
                                    })
                                }
                            </div>
                        </div>
                    </div>

                    <div className="Cards">
                        <div className="cardHolder">
                            {this.renderCard(0, this.state.selectedCard === 0)}
                        </div>
                        <div className="cardHolder">
                            {this.renderCard(1, this.state.selectedCard === 1)}
                        </div>
                        <div className="cardHolder">
                            {this.renderCard(2, this.state.selectedCard === 2)}
                        </div>
                        <div className="cardHolder">
                            {this.renderCard(3, this.state.selectedCard === 3)}
                        </div>
                        <div className="cardHolder">
                            {this.renderCard(5, this.state.selectedCard === 5)}
                        </div>
                        <div className="cardHolder">
                            {this.renderCard(8, this.state.selectedCard === 8)}
                        </div>
                        <div className="cardHolder">
                            {this.renderCard(13, this.state.selectedCard === 13)}
                        </div>
                        <div className="cardHolder">
                            {this.renderCard(21, this.state.selectedCard === 21)}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    renderCard(i, selected) {
        return <Card value={i} selected={selected}
                onClick={() => this.handleCardClick(i)}
                />;
    }

    handleCardClick(i) {
        let sc = i === this.state.selectedCard ? null : i;
        this.setState({
            selectedCard: sc
        });
    }
}

class Home extends React.Component {
    render() {
        return(
            <div>
                <input type="button" value="Start Game" onClick={() => this.handleStartGameClick()}/>
            </div>
        );
    }

    handleStartGameClick() {
        fetch("http://localhost:1111/createNewGame").then((response) => {
            response.json().then(resultObj => {
                if (resultObj["roomCreated"] === true) {
                    this.props.history.push("/" + resultObj["roomId"]);
                }
            });
        }).catch(() => {
            alert('Error while creating new room!');
        });
    }
}

function getRoomIdFromUrl() {
    return window.location.pathname.replace("/", "");
}

export default App;

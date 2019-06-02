import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import MediaHandler from '../MediaHandler';
import Pusher from 'pusher-js';
import Peer from 'simple-peer';

const APP_KEY = '9291a97a404792421744';

export default class App extends Component {
    constructor() {
        super();

        this.state = {
            hasMedia: false,
            otherUserId: null
        };
        this.user = window.user;
        this.peers = {};
        this.user.stream = null;
        this.MediaHandler = new MediaHandler();
        this.setupPusher();
        this.callTo = this.callTo.bind(this);
        this.setupPusher = this.setupPusher.bind(this);
        this.startPeer = this.startPeer.bind(this);
    }

    componentWillMount() {
        this.MediaHandler.getPermissions()
            .then((stream) => {
                this.setState({hasMedia: true});
                this.user.stream = stream;
                //Browsers support
                try {
                    this.myVideo.srcObject = stream;
                } catch(e) {
                    this.myVideo.src = URL.createObjectURL(stream);
                }
               
                this.myVideo.play();
            })
    }
    setupPusher() {
        this.pusher = new Pusher(APP_KEY, {
            authEndpoint: '/pusher/auth',
            cluster: 'ap2',
            auth: {
                params: this.user.id,
                headers: {
                    'X-CSRF-Token': window.csrfToken
                }
            }
        });

        this.channel = this.pusher.subscribe('presence-video-channel');
        this.channel.bind(`client-signal-${this.user.id}`, (signal) => {
            let peer = this.peers[signal.userId];
            //if peer is not exists, we got an incoming call
            if(peer === undefined) {
                this.setState({otherUserId: signal.userId});
                peer = this.startPeer(signal.userId, false);
            }
            peer.signal(signal.data);
        });
    }
    startPeer(userId, initiator = true) {
        const peer = new Peer({
            initiator,
            stream: this.user.stream,
            trickle: false
        });

        peer.on('signal', (data) => {
            this.channel.trigger(`client-signal-${userId}`, {
                type: 'signal',
                userId: this.user.id,
                data
            });
        });
        peer.on('stream', (stream) => {
            try {
                this.userVideo.srcObject = stream;
            } catch(e) {
                this.userVideo.src = URL.createObjectURL(stream);
            }
           
            this.userVideo.play();
        });

        peer.on('close', () => {
            let peer = this.peers[userId];
            if(peer != undefined) {
                peer.destroy();
            }
            this.peers[userId] = undefined;
        })

        return peer;
    }
    callTo(userId) {
        this.peers[userId] = this.startPeer(userId);
    }
    render() {
        return (
            <div className="App">

                {[1,2,3,4].map((userId) => {
                    return this.user.id != userId ? <button onClick={() => this.callTo(userId)}>Call {userId}</button> : null;
                })}
                <div className="video-container">

                    <video className="my-video" ref={(ref) => {this.myVideo = ref}}></video>
                    <video className="user-video" ref={(ref) => {this.userVideo = ref}}></video>
                </div>
            </div>
        );
    }
}

if (document.getElementById('app')) {
    ReactDOM.render(<App />, document.getElementById('app'));
}

import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import styled from "styled-components";

export default function App() {
  const socket = useRef();
  const myPeer = useRef(new RTCPeerConnection(PEER_CONFIG));
  const remoteStream = useRef(new MediaStream());

  const myVideo = useRef();
  const remoteVideo = useRef();
  const [myStream, setMyStream] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    (async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setMyStream(stream);
      if (myVideo.current) myVideo.current.srcObject = stream;
      stream.getTracks().forEach((track) => {
        myPeer.current.addTrack(track);
      });
    })();
  }, []);

  useEffect(() => {
    myPeer.current.addEventListener("track", async ({ track }) => {
      remoteStream.current.addTrack(track);
    });

    myPeer.current.addEventListener("connectionstatechange", () => {
      if (myPeer.current.connectionState === "connected") {
        setIsConnected(true);
        if (remoteVideo.current)
          remoteVideo.current.srcObject = remoteStream.current;

        console.log("Peer connected!!");
      }
    });
  }, []);

  const [myId, setMyId] = useState("");
  const [users, setUsers] = useState(null);
  const [offer, setOffer] = useState(null);
  const [caller, setCaller] = useState("");
  const [isCalling, setIsCalling] = useState(false);

  useEffect(() => {
    socket.current = io.connect("http://localhost:80");
    socket.current.on("setMyId", (myId) => setMyId(myId));
    socket.current.on("users", (users) => setUsers(users));

    socket.current.on("sendOfferToCallee", async ({ caller, offer }) => {
      if (offer) {
        setOffer(offer);
        setCaller(caller);
        setIsCalling(true);
      }
    });

    socket.current.on("sendAnswerToCaller", async ({ answer }) => {
      if (answer) {
        await myPeer.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
      }
    });

    socket.current.on("sendCandidateToTarget", async ({ candidate }) => {
      if (candidate) {
        try {
          await myPeer.current.addIceCandidate(candidate);
        } catch (e) {}
      }
    });
  }, []);

  async function onClickConnectRequest(callee) {
    const offer = await myPeer.current.createOffer();
    await myPeer.current.setLocalDescription(offer);
    socket.current.emit("offer", { callee, offer });

    myPeer.current.addEventListener(
      "icecandidate",
      iceCandidateHandler.bind(null, callee)
    );
  }

  async function onClickAccept() {
    myPeer.current.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await myPeer.current.createAnswer();
    await myPeer.current.setLocalDescription(answer);
    socket.current.emit("answer", { caller, answer });
    setIsCalling(false);

    myPeer.current.addEventListener(
      "icecandidate",
      iceCandidateHandler.bind(null, caller)
    );
  }

  function iceCandidateHandler(target, { candidate }) {
    if (candidate) {
      socket.current.emit("new-ice-candidate", { target, candidate });
    }
  }

  return (
    <div>
      <p>ID: {myId}</p>
      {myStream && (
        <Video ref={myVideo} muted autoPlay playsinline controls={false} />
      )}
      {isConnected && (
        <Video ref={remoteVideo} autoPlay playsinline controls={false} />
      )}
      {users &&
        users.map((callee) => {
          return (
            callee !== myId && (
              <button
                type="button"
                key={callee}
                onClick={() => onClickConnectRequest(callee)}
              >
                {callee}
              </button>
            )
          );
        })}
      {isCalling && (
        <div>
          <p>{caller} is calling you</p>
          <button type="button" onClick={onClickAccept}>
            Accept
          </button>
        </div>
      )}
    </div>
  );
}

const PEER_CONFIG = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const Video = styled.video`
  width: 300px;
  height: 200px;
  border: 1px solid red;
`;

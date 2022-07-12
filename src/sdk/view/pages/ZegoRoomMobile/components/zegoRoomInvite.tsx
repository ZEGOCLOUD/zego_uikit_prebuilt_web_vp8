import React, { ChangeEvent } from "react";
import zegoRoomInviteCss from "./zegoRoomInvite.module.scss";
import { ZegoCloudRTCCore } from "../../../../modules";
import { copy } from "../../../../modules/util";
import { ZegoToast } from "../../../components/zegoToast";
export class ZegoRoomInvite extends React.Component<{
  core: ZegoCloudRTCCore;
  closeCallBack: () => void;
}> {
  render(): React.ReactNode {
    return (
      <div className={zegoRoomInviteCss.roomDetails}>
        <div className={zegoRoomInviteCss.inviteHeader}>Room details</div>
        <div className={zegoRoomInviteCss.inviteURL}>
          {this.props.core._config.joinScreen?.inviteURL}
        </div>
        <div
          className={zegoRoomInviteCss.inviteCopy}
          onClick={(ev) => {
            ev.stopPropagation();
            this.props.core._config.joinScreen?.inviteURL &&
              copy(this.props.core._config.joinScreen?.inviteURL);

            ZegoToast({
              content: "Copy successfully",
              duration: 3,
            });
            this.props.closeCallBack();
          }}
        >
          <i></i>
          <span>Copy the link</span>
        </div>
      </div>
    );
  }
}

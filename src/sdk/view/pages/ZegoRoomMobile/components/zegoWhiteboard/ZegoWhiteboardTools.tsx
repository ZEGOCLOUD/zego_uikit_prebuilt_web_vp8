import React from "react";
import ZegoWhiteboardToolsCss from "./ZegoWhiteboardTools.module.scss";
import { ZegoWhiteboardToolsPenTooTips } from "./ZegoWhiteboardToolsPenToolTips";
import { ZegoWhiteboardToolsGraphicsTooTips } from "./ZegoWhiteboardToolsGraphicsTooTips";
import ShowPCManageContext, {
  ShowManageType,
} from "../../../context/showManage";
import { ZegoWhiteboardToolsTextTooTips } from "./ZegoWhiteboardToolsTextToolTips";
import { chooseFile } from "../../../../../util";

export class ZegoWhiteboardTools extends React.PureComponent<{
  onToolChange: (type: number, fontSize?: number, color?: string) => void;
  onFontChange: (
    font?: "BOLD" | "ITALIC" | "NO_BOLD" | "NO_ITALIC",
    fontSize?: number,
    color?: string
  ) => void;
  onAddImage: (file: File) => void;
  onSnapshot: () => void;
}> {
  static contextType?: React.Context<ShowManageType> = ShowPCManageContext;
  context!: React.ContextType<typeof ShowPCManageContext>;
  state: {
    hideTools: boolean;
    selectedTool: number;
    showTextTools: boolean;
    showGraphicsTools: boolean;
    showFontTools: boolean;
  } = {
    hideTools: false,
    selectedTool: 3,
    showTextTools: false,
    showFontTools: false,
    showGraphicsTools: false,
  };

  render(): React.ReactNode {
    return (
      <div className={ZegoWhiteboardToolsCss.tools}>
        {!this.state.hideTools && (
          <div
            className={`${ZegoWhiteboardToolsCss.tool_select} ${
              this.state.selectedTool === 1
                ? ZegoWhiteboardToolsCss.selected
                : ""
            }`}
            onClick={() => {
              this.setState({ selectedTool: 1 });
              this.props.onToolChange(32);
            }}
          ></div>
        )}
        {!this.state.hideTools && (
          <div
            className={`${ZegoWhiteboardToolsCss.tool_drag} ${
              this.state.selectedTool === 2
                ? ZegoWhiteboardToolsCss.selected
                : ""
            }`}
            onClick={() => {
              this.setState({ selectedTool: 2 });
              this.props.onToolChange(0);
            }}
          ></div>
        )}

        <div
          className={`ZegoWhiteboardToolsPenToolTips ${
            ZegoWhiteboardToolsCss.tool_pen
          } ${
            this.state.selectedTool === 3 ? ZegoWhiteboardToolsCss.selected : ""
          }`}
          onClick={() => {
            this.setState({ selectedTool: 3, showFontTools: true });
            this.props.onToolChange(1);
          }}
        >
          {this.state.showFontTools && (
            <ZegoWhiteboardToolsPenTooTips
              onToolChange={(fontSize: number, color: string) => {
                this.props.onToolChange(1, fontSize, color);
              }}
              onClose={() => {
                this.setState({ showFontTools: false });
              }}
            ></ZegoWhiteboardToolsPenTooTips>
          )}
        </div>

        {!this.state.hideTools && (
          <div
            className={`ZegoWhiteboardToolsTextToolTips ${
              ZegoWhiteboardToolsCss.tool_text
            } ${
              this.state.selectedTool === 4
                ? ZegoWhiteboardToolsCss.selected
                : ""
            }`}
            onClick={() => {
              this.setState({ selectedTool: 4, showTextTools: true });
              this.props.onToolChange(2);
            }}
          >
            {this.state.showTextTools && (
              <ZegoWhiteboardToolsTextTooTips
                onFontChange={(
                  font?: "BOLD" | "ITALIC" | "NO_BOLD" | "NO_ITALIC",
                  fontSize?: number,
                  color?: string
                ) => {
                  this.props.onFontChange(font, fontSize, color);
                }}
                onClose={() => {
                  this.setState({ showTextTools: false });
                }}
              ></ZegoWhiteboardToolsTextTooTips>
            )}
          </div>
        )}
        {!this.state.hideTools && (
          <div
            className={`ZegoWhiteboardToolsGraphicsTooTips ${
              ZegoWhiteboardToolsCss.tool_react
            } ${
              this.state.selectedTool === 5
                ? ZegoWhiteboardToolsCss.selected
                : ""
            }`}
            onClick={() => {
              this.setState({ selectedTool: 5, showGraphicsTools: true });
              ![4, 8, 16].includes(this.context.whiteboard_toolType!) &&
                this.props.onToolChange(16);
            }}
          >
            {this.state.showGraphicsTools && (
              <ZegoWhiteboardToolsGraphicsTooTips
                onToolChange={(type, fontSize: number, color: string) => {
                  this.props.onToolChange(type, fontSize, color);
                }}
                onClose={() => {
                  this.setState({ showGraphicsTools: false });
                }}
              ></ZegoWhiteboardToolsGraphicsTooTips>
            )}
          </div>
        )}
        {!this.state.hideTools && this.context.whiteboard_showAddImage && (
          <div
            className={`${ZegoWhiteboardToolsCss.tool_image} ${
              this.state.selectedTool === 6
                ? ZegoWhiteboardToolsCss.selected
                : ""
            }`}
            onClick={() => {
              this.setState({ selectedTool: 6 });
              chooseFile((file: File) => {
                this.props.onAddImage(file);
              });
            }}
          ></div>
        )}
        {!this.state.hideTools && (
          <div
            className={`${ZegoWhiteboardToolsCss.tool_eraser} ${
              this.state.selectedTool === 7
                ? ZegoWhiteboardToolsCss.selected
                : ""
            }`}
            onClick={() => {
              this.setState({ selectedTool: 7 });
              this.props.onToolChange(64);
            }}
          ></div>
        )}
        {!this.state.hideTools && (
          <div
            className={`${ZegoWhiteboardToolsCss.tool_delete} ${
              this.state.selectedTool === 8
                ? ZegoWhiteboardToolsCss.selected
                : ""
            }`}
            onClick={() => {
              this.setState({ selectedTool: 8 });
              this.props.onToolChange(512);
            }}
          ></div>
        )}
        {!this.state.hideTools && (
          <div
            className={`${ZegoWhiteboardToolsCss.tool_snapshot} ${
              this.state.selectedTool === 9
                ? ZegoWhiteboardToolsCss.selected
                : ""
            }`}
            onClick={() => {
              this.props.onSnapshot();
            }}
          ></div>
        )}
        <p></p>
        <div
          className={
            this.state.hideTools
              ? ZegoWhiteboardToolsCss.tool_show
              : ZegoWhiteboardToolsCss.tool_hide
          }
          onClick={() => {
            this.setState((preState: { hideTools: boolean }) => {
              return {
                hideTools: !preState.hideTools,
              };
            });
          }}
        ></div>
      </div>
    );
  }
}

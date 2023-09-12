/* eslint-disable no-unused-vars */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import MDEditor, { commands } from '@uiw/react-md-editor';
import MediaLib from '../MediaLib';
import styled from 'styled-components';
import '@uiw/react-markdown-preview/dist/markdown.css';
import '@uiw/react-md-editor/markdown-editor.css';
//import { Stack, Box, Typography } from '@strapi/design-system';
import { Stack } from "@strapi/design-system/Stack";
import { Box } from "@strapi/design-system/Box";
import { Typography } from "@strapi/design-system/Typography";
import { useIntl } from 'react-intl';

const Wrapper = styled.div`
> div:nth-child(2) {
  display: none;
}
.w-md-editor-bar {
  display: none;
}
.w-md-editor {
  border: 1px solid #dcdce4;
  border-radius: 4px;
  box-shadow: none;
  &:focus-within {
    border: 1px solid #4945ff;
    box-shadow: #4945ff 0px 0px 0px 2px;
  }
  min-height: 400px;
  display: flex;
  flex-direction: column;
  img {
    max-width: 100%;
  }
  .w-md-editor-preview {
    display: block;
    strong {
      font-weight: bold;
    }
    em {
      font-style: italic;
    }
  }
}
.w-md-editor-content {
  flex: 1 1 auto;
}
.w-md-editor-fullscreen {
  z-index: 3;
}
.w-md-editor-text {
  margin: 0;
}
.w-md-editor-preview ol {
  list-style: auto;
}
`;

const Editor = ({ name, onChange, value, intlLabel, disabled, error, description, required }) => {
  const { formatMessage } = useIntl();
  const [mediaLibVisible, setMediaLibVisible] = useState(false);
  const [mediaLibSelection, setMediaLibSelection] = useState(-1);

  const handleToggleMediaLib = () => setMediaLibVisible((prev) => !prev);

  const setNewValue = (valueData, tag) => {
    if (mediaLibSelection > -1) {
      valueData = value.substring(0, mediaLibSelection) + tag + value.substring(mediaLibSelection);
    } else {
      valueData = `${valueData}${tag}`;
    }
    return valueData;
  };

  const handleChangeAssets = (assets) => {
    let newValue = value ? value : '';
    assets.map((asset) => {
      if (asset.mime.includes('image')) {
        const imgTag = `<Img src="${asset.url}" />`;
        newValue = setNewValue(newValue, imgTag);
      } else if (asset.mime.includes('pdf')) {
        const pdfTag = `<PDF url="${asset.url}" />`;
        newValue = setNewValue(newValue, pdfTag);
      } else {
        const stringAlt = asset.alt.split(".");
        const position = stringAlt.length - 1;
        const fileTag = `<Resource url="${asset.url}" type="${stringAlt[position]}" />`;
        newValue = setNewValue(newValue, fileTag);
      }
      // Handle videos and other type of files by adding some code
    });
    onChange({ target: { name, value: newValue || '' } });
    handleToggleMediaLib();
  };
  return (
    <Stack spacing={1}>
      <Box>
        <Typography variant="pi" fontWeight="bold">
          {formatMessage(intlLabel)}
        </Typography>
        {required && (
          <Typography variant="pi" fontWeight="bold" textColor="danger600">
            *
          </Typography>
        )}
      </Box>
      <Wrapper>
        <MDEditor
          disabled={disabled}
          commands={[
            commands.group(
              [
                commands.title1,
                commands.title2,
                commands.title3,
                commands.title4,
                commands.title5,
                commands.title6
              ],
              {
                name: "title",
                groupName: "title",
                buttonProps: { "aria-label": "Insert title" }
              }
            ),
            commands.divider,
            commands.bold,
            commands.codeBlock,
            commands.italic,
            commands.strikethrough,
            commands.hr,
            commands.group,
            commands.divider,
            commands.link,
            commands.quote,
            commands.code,
            {
              name: 'image',
              keyCommand: 'image',
              buttonProps: { 'aria-label': 'Insert title3' },
              icon: (
                <svg width="12" height="12" viewBox="0 0 20 20">
                  <path
                    fill="currentColor"
                    d="M15 9c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm4-7H1c-.55 0-1 .45-1 1v14c0 .55.45 1 1 1h18c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1zm-1 13l-6-5-2 2-4-5-4 8V4h16v11z"
                  ></path>
                </svg>
              ),
              execute: (state, api) => {
                setMediaLibSelection(state.selection.end);
                handleToggleMediaLib();
              },
            },
            commands.unorderedListCommand,
            commands.orderedListCommand,
            commands.checkedListCommand,
          ]}
          preview="edit"
          value={value || ""}
          onChange={(newValue) => {
            onChange({ target: { name, value: newValue || "" } });
          }}
        />
        <div style={{ padding: "50px 0 0 0" }} />
        <MediaLib
          isOpen={mediaLibVisible}
          onChange={handleChangeAssets}
          onToggle={handleToggleMediaLib}
        />
      </Wrapper>
      {error && (
        <Typography variant="pi" textColor="danger600">
          {formatMessage({ id: error, defaultMessage: error })}
        </Typography>
      )}
      {description && (
        <Typography variant="pi">{formatMessage(description)}</Typography>
      )}
    </Stack>
  );
};

Editor.propTypes = {
  onChange: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
};

export default Editor;

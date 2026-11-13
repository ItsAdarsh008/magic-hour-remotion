import React from "react";
import { Composition } from "remotion";
import { ScriptEdit, scriptEditSchema } from "./ScriptEdit";
import { FounderUpdate, founderUpdateSchema } from "./FounderUpdate";

export const Root: React.FC = () => (
  <>
    {/* The demo: edit `line` in the Studio's props panel and the host's mouth re-syncs. */}
    <Composition
      id="ScriptEdit"
      component={ScriptEdit}
      schema={scriptEditSchema}
      defaultProps={{
        line: "We shipped it today, not Friday.",
        voice: "cv-0001",
      }}
      durationInFrames={180}
      fps={30}
      width={1920}
      height={1080}
    />
    {/* A data-driven template: one headshot + a script -> a talking update video. */}
    <Composition
      id="FounderUpdate"
      component={FounderUpdate}
      schema={founderUpdateSchema}
      defaultProps={{
        name: "Adarsh",
        headshot: "founder.png",
        script: "This week we doubled signups and cut render time in half.",
        voice: "cv-0001",
      }}
      durationInFrames={210}
      fps={30}
      width={1080}
      height={1920}
    />
  </>
);

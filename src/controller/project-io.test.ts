import { exportProjectToJson, importProjectFromJson } from "./project-io";
import { createFixtureProject } from "../test/fixtureProject";

describe("project import/export", () => {
  it("round-trips without data loss", () => {
    const original = createFixtureProject();
    const json = exportProjectToJson(original);
    const imported = importProjectFromJson(json);
    expect(imported).toEqual(original);
  });
});


// Without this, navigating to /tasks/new from within /tasks would also
// match the @modal slot's (.)[id] intercepted route (treating "new" as a
// task id) and render a broken modal alongside the real New Task page.
// This static route takes precedence and renders nothing for the modal slot.
export default function ModalNewTaskSlot() {
  return null;
}

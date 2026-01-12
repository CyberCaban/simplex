{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    bun
    # rustToolchain
    pkg-config
    openssl
    alsa-lib
    vulkan-tools
    webkitgtk_4_1
    gtk3
  ];

  shellHook = ''
    echo Hello from simplex
  '';
}

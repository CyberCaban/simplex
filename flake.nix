{
  description = "Tauri flake";

  inputs = {
   nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
   flake-utils.url = "github:numtide/flake-utils";
   rust-overlay.url = "github:oxalica/rust-overlay";
  };

  outputs = { self, nixpkgs, ... }@inputs: 
    inputs.flake-utils.lib.eachDefaultSystem (system:
    let 
      overlays = [ (import inputs.rust-overlay) ];
      pkgs = import nixpkgs {
          inherit system overlays;
        };

      # Define rust toolchain
      rustToolchain = pkgs.rust-bin.stable."1.89.0".default;
    in
    {
      devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            bun
            rustToolchain
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
        };
    }
  );
}

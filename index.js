import { compile, createFileManager } from "@noir-lang/noir_wasm";
import { UltraHonkBackend } from "@aztec/bb.js";
import { Noir } from "@noir-lang/noir_js";
import initNoirC from "@noir-lang/noirc_abi";
import initACVM from "@noir-lang/acvm_js";
import acvm from "@noir-lang/acvm_js/web/acvm_js_bg.wasm?url";
import noirc from "@noir-lang/noirc_abi/web/noirc_abi_wasm_bg.wasm?url";
await Promise.all([initACVM(fetch(acvm)), initNoirC(fetch(noirc))]);

import main from "./circuit/src/main.nr?url";
import nargoToml from "./circuit/Nargo.toml?url";

let proofGenerated = false;

export async function getCircuit() {
	const fm = createFileManager("/");
	const { body } = await fetch(main);
	const { body: nargoTomlBody } = await fetch(nargoToml);

	fm.writeFile("./src/main.nr", body);
	fm.writeFile("./Nargo.toml", nargoTomlBody);
	return await compile(fm);
}
const show = (id, content) => {
	const container = document.getElementById(id);
	container.appendChild(document.createTextNode(content));
	container.appendChild(document.createElement("br"));
};

async function generateProof(credit_score) {
	if (proofGenerated) {
		return;
	}
	
	try {
		const { program } = await getCircuit();
		const noir = new Noir(program);
		const backend = new UltraHonkBackend(program.bytecode);
		show("logs", "Generating witness... ⏳");
		const { witness } = await noir.execute({ credit_score });
		show("logs", "Generated witness... ✅");
		show("logs", "Generating proof... ⏳");
		const proof = await backend.generateProof(witness);
		show("logs", "Generated proof... ✅");
		show("results", proof.proof);
		show("logs", "Verifying proof... ⌛");
		const isValid = await backend.verifyProof(proof);
		show("logs", `Proof is ${isValid ? "valid" : "invalid"}... ✅`);
		
		window.parent.postMessage({
			type: 'proof',
			value: proof.proof,
			isValid: isValid
		}, '*');
		
		proofGenerated = true;
		
		const submitButton = document.getElementById("submit");
		if (submitButton) {
			submitButton.disabled = true;
			submitButton.style.opacity = "0.5";
			submitButton.textContent = "Proof already generated";
		}
		
	} catch (err) {
		console.error(err);
		show("logs", "Oh 💔");
	}
}


window.addEventListener('message', async (event) => {
	const { type, value } = event.data;
	if (type === 'creditScore' && !proofGenerated) {
		await generateProof(value);
	}
});
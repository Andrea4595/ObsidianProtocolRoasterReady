export const showHiddenCardConfirmation = () => {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 2000;';

        const modal = document.createElement('div');
        modal.style.cssText = 'background-color: #fff; padding: 25px; border-radius: 12px; text-align: center; box-shadow: 0 5px 15px rgba(0,0,0,0.3);';

        const message = document.createElement('p');
        message.textContent = '비공개 카드를 숨기시겠습니까?';
        message.style.cssText = 'margin: 0 0 20px; font-size: 18px;';

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 15px; justify-content: center;';

        const hideBtn = document.createElement('button');
        hideBtn.textContent = '비공개 숨김';
        hideBtn.style.cssText = 'padding: 10px 20px; border-radius: 8px; border: 1px solid #6c757d; background-color: #6c757d; color: white; font-size: 16px; cursor: pointer;';

        const revealBtn = document.createElement('button');
        revealBtn.textContent = '모두 공개';
        revealBtn.style.cssText = 'padding: 10px 20px; border-radius: 8px; border: 1px solid #17a2b8; background-color: #17a2b8; color: white; font-size: 16px; cursor: pointer;';

        hideBtn.onclick = () => {
            document.body.removeChild(overlay);
            resolve(true);
        };

        revealBtn.onclick = () => {
            document.body.removeChild(overlay);
            resolve(false);
        };

        buttonContainer.appendChild(hideBtn);
        buttonContainer.appendChild(revealBtn);
        modal.appendChild(message);
        modal.appendChild(buttonContainer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    });
};